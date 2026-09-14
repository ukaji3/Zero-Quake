# 性能改善 設計書（Issue #18〜#27）

対象ブランチ: `fix/performance-issues-18-27`
トラッキング Issue: #28

## 0. 目的と非目的

### 目的

- MainWindow レンダラーの定常 CPU 7% と、メインプロセスの定常 CPU 4% を削減する
- 毎秒 2.7MiB の IPC 構造化クローンを数十 KB に削減する
- 長時間稼働で単調増加するリソース（レイヤ・リスナー・Popup・保持データ）を有界化する
- 潜在的な暴走・例外経路（WorkerWindow 再生成ループ、ColorTable TypeError 等）を塞ぐ
- 障害切り分けに必要なログ（情報源名・デバッグログ）を整備する

### 非目的

- 地震検知アルゴリズム（`EQDetectWorker.js` の閾値・同定ロジック）の変更
- UI・表示仕様の変更（描画結果は現行と同一であること）
- upstream への変更（本 fork のみ。upstream は参照のみ）
- 既存の ESLint 93 件のうち本変更と無関係な箇所の修正

## 1. 観測点マスタの性質と系統別方針（#18/#19 の前提整理）

| 系統 | マスタ取得元 | プロセス寿命中の変動 | 方針 |
|---|---|---|---|
| K-NET/KiK-net（kmoni） | `src/Resource/Knet_Points.json`（同梱） | **不変**（リリースでのみ更新） | マスタ 1 回送信 + TypedArray 差分。`setFeatureState` |
| S-net（msil） | `src/Resource/Snet_Points.json`（同梱） | 不変 | **現行維持**。156 点 / 10 秒間隔で負荷は無視できる。ColorTable ガードのみ適用 |
| TREM-RTS | `api-*.exptech.dev/.../trem/station` | **準静的**（起動時・ネット復帰時に再取得） | ハイブリッド。マスタ受信時に `setData`、毎秒は `setFeatureState`。未知 StID 検出時にマスタ再取得（60 秒スロットル） |
| Wolfx SeisJS | なし（各メッセージに座標同梱、15 秒で消滅） | **毎秒増減** | **現行維持**（Feature 集合が毎秒変わるため `setData` が正しい）。点数は少ない |

新観測点が追加された場合の挙動:
- kmoni/S-net: 新バージョンの JSON を読めば起動時の `setData` で自動追従。コード変更不要
- TREM-RTS: `rts` に未知 StID が来たらマスタを再取得 → `setData` で Feature 集合を再構築。**現行（未知 StID を無視）より改善**
- SeisJS: 現行どおり毎秒の `setData` で追従

## 2. #19 IPC プロトコル設計（kmoni）

### 2.1 現行

`WorkerWindow` → main → worker_threads → main → `MainWindow` の 4 ホップで、1,732 点 × 全フィールド（約 689KB）を毎秒クローン。

### 2.2 新プロトコル

**マスタ（起動時 1 回、および MainWindow 再生成時に再送）**

```
WorkerWindow → main      { action: "kmoniMaster", data: StationMaster[] }
main → worker_threads    { action: "StationMaster", data: StationMaster[] }
main → MainWindow        { action: "kmoniMaster", data: StationMaster[] }   ※ MainWindow 生成時にも再送
```

`StationMaster` は `Knet_Points.json` を `elm.Point && !elm.IsSuspended` で filter した配列。**配列順序（index）が以降のすべての TypedArray の座標系**になる。filter は WorkerWindow のみで行い、他プロセスは受信した配列をそのまま使う（順序不一致を構造的に排除）。

```ts
interface StationMaster {
  Code: string; Name: string; Region: string; Type: string;
  IsSuspended: boolean; checked: boolean;
  Location: { Latitude: number; Longitude: number };
}
```

**毎秒（値のみ）**

```
WorkerWindow → main      { action: "kmoniReturn", date: number,
                           shindo: Float32Array(n), pga: Float32Array(n),
                           rgb: Uint8Array(3n), valid: Uint8Array(n) }
main → worker_threads    { action: "EQDetect", date, detect: boolean,
                           shindo, pga, valid }                 ※ postMessage の transfer で移譲
worker_threads → main    { action: "PointsData_Update", date,
                           shindo, pga, valid, detectLv: Uint8Array(n),
                           EQDetect_List }                      ※ transfer で返却
main → MainWindow        { action: "kmoniUpdate", timestamp, LocalTime,
                           shindo, pga, rgb, valid, detectLv }
```

- `valid[i] = 1` は画像上で観測点に色があった（現行 `elm.data === true`）
- `detectLv[i] ∈ {0,1,2}`（現行 `detect2 ? 2 : detect ? 1 : 0`）
- サイズ: n=1,732 で shindo 6.9KB + pga 6.9KB + rgb 5.2KB + valid 1.7KB + detectLv 1.7KB ≒ **22KB/ホップ**（現行 689KB → 約 1/30）
- `ipcRenderer.send` / `webContents.send` は構造化クローンで TypedArray を渡せる（コピー。22KB なので許容）。worker_threads 間は `postMessage(msg, [buffers])` で transfer

**rgb の扱い**: main は `rgb` を保持して MainWindow へ転送する（worker は不要）。

### 2.3 EQDetectWorker の適合方法（アルゴリズム無変更）

worker は `StationMaster` 受信時に**永続的な観測点状態配列** `stations[i]` を構築する:

```js
{ Code, Region, Location, data:false, pga:0, shindo:0,
  detect:false, detect2:false }
```

毎秒 `EQDetect()` は TypedArray から `stations[i].data/pga/shindo` を **in-place 更新**したのち、**現行の `data` 配列を `stations` に差し替えて既存アルゴリズムをそのまま実行**する。`pointsData` / `EQDetect_List` / `GuessHypocenter` / `calcDifference` は無変更。

**現行の「毎秒フレッシュなオブジェクト」セマンティクスを厳密に再現するための規則**（設計レビューで判明した必須事項）:

1. **`isCity` を `stations[i]` に持たせない。** 現行 `EQDetectWorker.js`:154 は `elm.isCity`（データ要素側）を参照しているが、データ要素に `isCity` は存在せず常に `undefined`（＝非都市の `MargeRange=40km` が使われる）。`stations[i].isCity` を定義すると都市部で `MargeRangeC=20km` に切り替わり**判定結果が変わる**。この現行挙動の是非は本変更の範囲外（別 Issue 候補として記録）とし、挙動維持を優先する。`isCity` は従来どおり `pointsData[Code].isCity` にのみ保持する
2. **毎秒の先頭で `stations[i].detect = false; stations[i].detect2 = false;` にリセットする。** 現行はフレッシュな複製に `detect` が存在しない（`undefined`）ため、`elm.data` が偽・`EEWNow` が真・`detect` 引数が偽のいずれかで判定ブロックを通らない秒は `detect` が偽になる。永続化するとこれが前秒の値を引き継いでしまうため、明示リセットが必須
3. **`valid[i] = 0` の点は `pga`/`shindo` を更新しない（前回値を保持）。** 現行の WorkerWindow 側 `points` も永続オブジェクトで `data=false` 時は `shindo`/`pga` を書き換えないため、同じ挙動になる
4. `Replay` 受信時（`pointsData = {}` の直後）に全 `stations[i]` の `detect/detect2` もリセットする

- 現行では `EQDetect_List[].Codes` が「その秒のデータオブジェクト」を参照していたため、翌秒以降は古いスナップショットになっていた。新設計では永続オブジェクトを参照するため `Codes[].detect` 等が最新値になる。アルゴリズム上 `Codes[]` から読まれるのは `Code / Location`（worker 内）と `Region`（`mainWindow.js`:582 の検知地域表示）のみで、判定結果に影響しない
- `Region` は上記 2 用途（`pointsData` 生成時の `isCity` 判定、検知地域表示）のためマスタに含める
- マスタ未受信で `EQDetect` が届いた場合は無視する（起動直後のレース対策）
- WorkerWindow が再読み込みされた場合（設定変更時の `WorkerWindow.reload()`、`main.js`:806 付近）はマスタが再送される。worker は `stations` を再構築するが `pointsData`（Code キー）は維持する。MainWindow は `setData` をやり直し、前回値キャッシュを破棄して全点を再送する

### 2.4 MainWindow の描画（#18）

**ソース構築（マスタ受信時 1 回）**

```js
features[i] = { type:"Feature", id: i,
  properties: { Code, Name, Region, Type, IsSuspended, checked },
  geometry: { type:"Point", coordinates:[lon, lat] } }
map.getSource("knet_points").setData(fc);
```

`id` は `setFeatureState` に必須。数値 index を使う。

**毎秒更新**

```js
for i in 0..n-1:
  if (changed(i))   // 前回値と shindo/rgb/valid/detectLv のいずれかが異なる
    map.setFeatureState({source:"knet_points", id:i},
      { r, g, b, valid, detectLv, shindo, pga });
```

前回値は TypedArray として保持し、`background` 中は更新をスキップ。`activate` で `forceAll = true` にして全点を再送する（スキップ中の差分欠落を防ぐ）。

**レイヤ paint 式**

```js
"circle-color": ["rgb",
  ["coalesce", ["feature-state","r"], 0],
  ["coalesce", ["feature-state","g"], 0],
  ["coalesce", ["feature-state","b"], 0]],
"circle-opacity": ["case", ["==", ["coalesce", ["feature-state","valid"], 0], 1], 1, 0],
"circle-stroke-opacity": 同上,
"circle-stroke-color": ["match", ["coalesce", ["feature-state","detectLv"], 0],
  0, "transparent", 1, "#cb732b", 2, "#cb2b2b", "#0000"],
```

現行は `valid=false` の点を Feature から除外していたが、新設計では全点常駐で opacity 0 にする。クリックハンドラでは `valid=0` の点を無視する（不可視点のポップアップ抑止）。

**ポップアップ**: Feature の `properties` に値が無くなるため、`e.features[0].id` から最新配列を参照して内容を生成する。毎秒の更新は「開いている Popup のみ」を走査（`kmoni_popup` の delete 導入と併せて #23 で対応）。

**再表示（activate）**: 現行の `knetMapData` 再描画は「最新 TypedArray の全点強制反映」に置き換える。

### 2.5 TREM-RTS ハイブリッド

- main: `TremRts_sta` 取得完了時に `{ action:"TREM-RTSMaster", data: [{Code, lon, lat}] }` を送信（MainWindow 生成時にも再送）。毎秒は `{ action:"TREM-RTSUpdate", data: { [StID]: [shindo, pga, r, g, b] } }` に縮約（Type/Name/Region/Location を除去）
- main: `rts` に未知 StID があれば `Req_TremRts_sta()` を呼ぶ（60 秒スロットル）
- MainWindow: マスタ受信で `setData`（id=index、Code→index マップ保持）。毎秒は該当 index に `setFeatureState`、前回報告あり今回なしの点は `valid=0`

## 3. #20 kmoni 画像転送

- main: `r.arrayBuffer()` の結果をそのまま `webContents.send("message2", { action:"KmoniImgUpdate", data: buffer, date })`。`Buffer.from(...).toString("base64")` と data URL 連結を削除
- WorkerWindow: `createImageBitmap(new Blob([data], { type:"image/gif" }))` → `drawImage` → `bitmap.close()` → `kmoniRedraw(date)`。`date` はクロージャで束縛し、非同期デコードの順序ずれで `kmoni_date` が食い違わないようにする
- msil PNG（`SnetImgUpdate`）も同じ方式に統一
- 404 は「現在秒の画像未生成」の正常系: `GeneralError_handler` へ流さず `debugLog` のみ。URL ローテーション用の `Kmoni_ErrorCount` 加算は維持（`SetKmoniOffset` の契機として必要）

## 4. #21 バックグラウンド判定

| 項目 | 方針 |
|---|---|
| `blur` の追加 | **採用しない**。2 台目モニタに常時表示しながら他アプリで作業する用途で地図が止まる回帰になるため。Issue #21 の修正案 1 は本設計で却下し、その旨を Issue に記録する |
| `mouseover` による `background=false` | 削除。activate は `focus/show/restore` イベントに一元化 |
| `visibilitychange` | 追加。`document.hidden` で `background=true`、復帰で `activate` 相当を実行。最小化・完全遮蔽（プラットフォーム対応時）を捕捉 |
| `knet_already_draw` | 変数と 52 行のゲートを削除。ゲートは `kmoniMapUpdate` 側に一元化 |
| WorkerWindow の `backgroundThrottling` | `webPreferences` 内へ移動（意図どおり非スロットル化） |
| MainWindow の `backgroundThrottling:false` | 維持（EEW 即時性）。#18/#19 で毎秒コストが下がるため許容 |

## 5. #22 避難所オーバーレイ

タイル毎の source/layer/listener を廃止し、**固定 2 source + 2 layer** に統合する。

- `hinanjo_eq` / `hinanjo_ts` の geojson source と circle layer を `init` で 1 回だけ追加。click リスナーも 1 回
- `sourcedataloading` で新タイルを検出 → `fetch()` で GSI の skhb04/05 GeoJSON を取得 → 各 feature に `properties._tile = "z/x/y"` を付与して集約配列に追加 → `setData`
- タイルキャッシュは LRU（上限 64 タイル）。超過時は最古タイルの feature を除去して `setData`
- `hinanjoLayers` 配列と `overlaySelect` 内の forEach は固定 2 layer の `setLayoutProperty` に置換
- 同一タイルの重複 fetch は in-flight Set で抑止

## 6. #23 レンダラー側の解放漏れ

- **津波点滅**: 全解除（`tsunamiDataUpdate` で対象区域が空、または取消電文）時に `tsunamiData = null`。`setInterval` は維持（ゲートが閉じれば無負荷）
- **kmoni_popup**: `Popup` の `close` イベントで `delete kmoni_popup[Code]`。毎秒の更新走査は `Object.keys(kmoni_popup)` のみ（開いている数件）
- **psWaveAnm**: `current_EEW.length === 0` ならタイマーを再スケジュールせず停止。`psWaveEntry()`（EEW 受信）で停止中なら再着火
- **時計**: `all_UpdateTime` に `!background` ガード追加

## 7. #24 メインプロセス保持データの有界化

共通ヘルパー `pruneByCount(collection, max, sortKey)` を `main.js` に追加し、以下を有界化する。

| 構造 | 上限 | 破棄基準 |
|---|---|---|
| `EQInfoData` | 300 event | `reportDateTime` 古い順 |
| `eqInfo.jma` | `max(JMA_CurrentInfoNumber * 2, 100)` | `DateForSort` 古い順（表示範囲は保護） |
| `EQCount_data` | 100 | 古い順 |
| `EEW_Storage` | 50 event | 古い順 |
| `EEW_Storage[].data` | 30 報 | 古い順 |
| `EarlyEst_Data` | 100 | 古い順 |
| `Tsunami_Data` | 100 | 古い順 |
| `*InfoAll`（3 種） | 50 | 古い順 |
| `jmaXML_Fetched` | `Set`、2,000 | 挿入順（Set の反復順）で最古を削除。`includes()` → `has()` |

- `latest_reportDate`（4263 行）: `Math.max(...Object.keys(EQInfoData)...)` を廃止し、追加時に更新する変数 `EQInfo_latestReportDate` を導入
- 3061 行の `Math.max(...SameEEW.data.map(...))` も同様に有界化後は上限 30 のため許容（スプレッドの引数上限問題は消滅）
- `JMA_CurrentInfoNumber` は仕様（ユーザー操作）のため据え置き

## 8. #25 制御フロー欠陥

- `Create_WorkerWindow`: 意図的な close 時は `WorkerWindow.__recreating = true` を立て、`close` ハンドラで再生成予約をスキップ。`unresponsive` 経路は `if (WorkerWindow && WorkerWindow.responsive)` に修正。再生成回数は 10 分間に 5 回を上限とし超過時はログ出力して停止
- WebSocket 3 系統の `close` ハンドラで対応タイマーを `clearInterval` して `null` 代入。Wolfx/SeisJS の ping タイマー設置を `message` から `connect` ハンドラへ移動
- `Req_TremRts` / `Req_EarlyEst` / `RegularExecution` に `Req_kmoni` と同じタイマー変数 + `clearTimeout` ガード
- `powerSaveBlocker`: Early-Est の解除経路でも `stop`。`psBlock` の start/stop を `ensurePowerSaveBlock(on: boolean)` に集約

## 9. #26 ColorTable ガード

```js
var v = ColorTable[rgb[0]]?.[rgb[1]]?.[rgb[2]];
if (v === undefined) { /* RGBtoP フォールバック（現行と同じ） */ } else elm.shindo = v;
```

現行 `if (!elm.shindo)` は震度 0（テーブル値 `0`）をフォールバックに誤誘導するため `=== undefined` に修正する。`forEach` を `for` に変え点単位で例外を捕捉、異常 RGB は `debugLog` に集約（毎秒出さないよう 60 秒に 1 回）。

## 10. #27 ログ

- `debugLog(...args)`: `DEBUG_MODE` 時のみ `console.log(時刻, ...args)`
- `GeneralError_handler(err, source?)`: `source` を先頭に出力。全 `HTTP Error` throw に `source` と URL を含める
- `Req_*` の開始/成功/失敗、WS の connect/close/reconnect、`UpdateStatus` の状態遷移、kmoni パイプラインの到達（マスタ送信・毎秒送信件数）を `debugLog`
- `package.json` の `start` を `electron . -v` に修正（未使用フラグ削除）

## 11. 変更ファイルと責務分担

| ファイル | 変更対象 Issue |
|---|---|
| `src/main.js` | #19（main 側中継・マスタ保持・再送）, #20, #21（backgroundThrottling）, #24, #25, #27, TREM ハイブリッド |
| `src/js/mainWindow.js` | #18, #19（受信側）, #21（visibilitychange・mouseover・knet_already_draw）, #22, #23 |
| `src/WorkerWindow.html` | #19（送信側・マスタ）, #20（ArrayBuffer 受信）, #26 |
| `src/js/EQDetectWorker.js` | #19（stations 永続配列） |
| `package.json` | #27（start） |

## 12. 検証計画

1. `eslint src/`: 変更ファイルで**新規エラー 0**（既存 93 件のうち変更箇所に含まれるものは修正）
2. `node --check` 相当の構文検証（ESM のため `node --input-type=module -e "import('./src/main.js')"` は副作用があるので `eslint` の parse で代替）
3. スモークテスト: 別 `--user-data-dir` で `electron . -v` を 90 秒起動し、ログで以下を確認
   - `kmoniMaster` 送信 1 回 → `kmoniUpdate` が毎秒到達
   - 例外・`Failed to` 系ログが無い
   - TREM マスタ受信 → 毎秒更新
4. 負荷比較: 稼働 60 秒後の各プロセス CPU/RSS を現行と比較（同条件で計測、結果を Issue #28 に記録）
5. `npm run build:linux` で deb 生成、`dpkg -c` で内容確認

## 13. リスクと緩和

| リスク | 緩和 |
|---|---|
| Feature 常駐 + opacity 0 により不可視点がクリック対象になる | click ハンドラで `valid` を確認して無視 |
| マスタ未受信の状態で値が届く（起動レース） | 各受信側で「マスタ未受信なら破棄」。main はマスタを保持し MainWindow 生成時に**必ずマスタ → 最新値の順**で送る（`main.js`:1098-1115 の再送ブロックに追加） |
| TREM マスタの再取得が頻発 | 60 秒スロットル |
| 有界化による表示件数の減少 | `eqInfo.jma` は表示件数の 2 倍を保護。他は履歴用途で上限は運用上十分な値 |
| `blur` 非採用により「他アプリ前面で負荷が残る」 | #18/#19 で毎秒コストが 1/30 以下になるため実害は解消。設計判断を Issue #21 に記録 |
| 永続 `stations` により検知アルゴリズムの挙動が変わる | 2.3 章の規則 1〜4 で現行セマンティクスを厳密に再現 |

## 14. 設計レビュー記録

独立したサブエージェントによるレビューを 2 回試行したが、実行環境の制約（承認プロンプトを表示できるサーフェスが無い）で起動できなかった。代替として、以下の**仕様根拠に基づくセルフレビュー**を実施した。独立レビューが得られていない点は成果報告に明記する。

### 検証済みの技術的前提

| 前提 | 根拠 | 結果 |
|---|---|---|
| `circle-color/opacity/stroke-color/stroke-opacity/radius/stroke-width` が `feature-state` を受け付ける | `node_modules/@maplibre/maplibre-gl-style-spec/src/reference/v8.json` の `paint_circle.*.expression.parameters` に `"feature-state"` が含まれる | ✅ 6 プロパティすべて対応 |
| `Map.setFeatureState(feature: FeatureIdentifier, state)` の公開 API | `node_modules/maplibre-gl/dist/maplibre-gl.d.ts`:14657 | ✅ |
| `contextBridge` / `ipcRenderer.send` で TypedArray・ArrayBuffer が渡る | Electron 公式 context-bridge ドキュメントの型対応表「Cloneable Types（構造化クローン）: ✅」 | ✅ |
| `worker_threads.postMessage` の transfer list | Node.js 標準（`postMessage(value, transferList)`） | ✅ |
| `createImageBitmap(Blob)` → `OffscreenCanvasRenderingContext2D.drawImage` | Chromium 標準。alpha 保持 | ✅ |

### レビューで判明し設計に反映した事項

| 区分 | 内容 | 反映箇所 |
|---|---|---|
| **重大** | `stations[i].isCity` を定義すると `EQDetectWorker.js`:154 の判定が現行と変わる（現行はデータ要素に `isCity` が無く常に非都市扱い） | 2.3 規則 1 |
| **重大** | 永続オブジェクトでは `detect/detect2` が前秒から引き継がれる。判定ブロックを通らない秒で偽に戻らない | 2.3 規則 2 |
| 中 | `valid=0` の点の `pga/shindo` は前回値保持が現行挙動 | 2.3 規則 3 |
| 中 | `Replay` 時に `stations` の検知フラグもリセットが必要 | 2.3 規則 4 |
| 中 | MainWindow 再生成時の送信順序（マスタ → 値）を明示 | 13 章 |
| 軽微 | `mainWindow.js`:582 が `Codes[].Region` を表示に使うためマスタに `Region` 必須 | 2.3 |
| 軽微 | 設定変更時の `WorkerWindow.reload()` でマスタが再送されるケースの扱い | 2.3 |

### 判定

**条件付き GO**。上記反映済みの条件下で実装に進む。実装後のコードレビューで 2.3 の規則 1〜4 の遵守を必須確認項目とする。

## 15. コードレビュー記録

独立サブエージェントによるレビューは 2 回試行したが起動できず（設計レビュー時と同じ環境制約）。差分（`git diff HEAD -- src/ package.json`、5 ファイル +1083/−428）を対象に、以下のチェックリストでセルフレビューを実施した。

### 必須確認項目（設計 2.3 章）

| 規則 | 確認結果 |
|---|---|
| 1. `stations[i]` に `isCity` を持たせない | ✅ `buildStations()` のフィールドは Code/Region/Location/data/pga/shindo/detect/detect2 のみ |
| 2. 毎秒先頭で detect/detect2 リセット | ✅ `EQDetectFromArrays()` 冒頭で `resetDetectFlags()` |
| 3. `valid=0` の点は pga/shindo を更新しない | ✅ `else { st.data = false; }` のみ |
| 4. Replay 時のリセット | ✅ `case "Replay"` で `pointsData = {}` の直後に `resetDetectFlags()` |
| `EQDetect()` 本体（アルゴリズム）が無変更 | ✅ `git diff` の変更行は関数末尾の postMessage 移動のみ |

### レビューで判明し修正した事項

| 区分 | 内容 | 対応 |
|---|---|---|
| **重大** | `hinanjoInitLayers()` を `init()` 直下（スタイル読込前）で呼んでおり `Style is not done loading` 例外で `map.on("load")` ハンドラ全体が動かなくなっていた | `map.on("load")` 内の先頭へ移動 |
| 中 | `tsunamiPopup()` が `tsunamiData.areas` を無ガードで参照。#23 で `tsunamiData = null` を導入したため理論上 TypeError の経路が生じる（レイヤ filter で該当 feature は描画されないため実害はほぼ無い） | `tsunamiData && tsunamiData.areas` にガード |
| 中 | アプリ終了時のウィンドウ close で WorkerWindow の再生成が予約される（`WorkerWindow closed unexpectedly` ログ） | `app.on("before-quit")` で `appQuitting` を立て、再生成をスキップ |
| 軽微 | `Req_TremRts_sta()` の 60 秒スロットルが初回失敗時の再試行にも適用され復旧が遅れる | マスタ未取得時は 5 秒スロットル |
| 軽微 | `kmoniRedraw` で状態配列を二重コピーしていた | in-place 更新 + 送信時のみ複製 |

### 設計・Issue 記載に対する訂正

- **#25 項目 4「`powerSaveBlocker` の stop 漏れ」は誤検出**。`EarlyEst_Alert()` は `EEW_Active` に登録し（`main.js` の該当関数内 `EEW_Active.push(data)`）、期限切れは `RegularExecution` → `EEW_Clear()` を通るため、`EEW_Active` が空になった時点で `stop` される。修正不要。Issue #25 にコメントで訂正する。
- HEAD の `WorkerWindow.html` は震度 0（ColorTable 値 `0`）を `if (!elm.shindo)` で偽と判定し RGBtoP フォールバックへ流していた。新実装は `=== undefined` 判定で正確に 0 を返す（挙動改善。#26 に記載済み）。

### 残存する既知の制約

- `kmoniLatestRgb`（main が保持）と worker から戻る shindo/pga は別経路のため、worker 往復中に次の `kmoniReturn` が届いた場合、rgb が 1 秒分先行しうる。通常の負荷では往復は数 ms で発生しない。
- 既存 ESLint エラー（HEAD: main.js 24 件、mainWindow.js 45 件）のうち本変更の対象外の箇所は未修正。本変更による**新規エラーは 0**（main.js は 24 → 23、mainWindow.js は 45 → 45、EQDetectWorker.js は 0 → 0）。
- リポジトリの `eslint.config.js` が依存する `@eslint/eslintrc` が package.json に無く実行不能（upstream 由来）。同等ルールの一時設定で検証した。

## 16. 検証結果

### 静的検証

- `node --check`: main.js / EQDetectWorker.js 構文 OK。WorkerWindow.html はインラインスクリプトを抽出して検証、ESLint エラー 0
- ESLint: 上記の通り新規エラー 0

### 動的検証（別 `--user-data-dir` で起動、CDP で内部状態を確認）

| 項目 | 結果 |
|---|---|
| kmoni マスタ受信（main ログ） | `kmoni master received: 1732 stations` |
| kmoni 毎秒パイプライン（main ログ） | `62 updates in last 61s, valid points=1572/1732` |
| MainWindow: `kmoniMaster.length` / `knet_points` feature 数 | 1732 / 1732（`id` は index） |
| MainWindow: feature-state（id=0） | `{r:0,g:0,b:205,valid:1,detectLv:0,shindo:-3,pga:0.01}` |
| MainWindow: 差分モード稼働 | `kmoniPrev` 設定済み、`forceAll=false`、`background=false` |
| MainWindow: paint 式 | `circle-color` に `feature-state` を使用 |
| TREM-RTS | マスタ 188 点、報告 112 点、state 反映確認 |
| 避難所 | `hinanjo_eq` / `hinanjo_ts` レイヤ存在 |
| psWaveAnm | EEW 無しで停止（`psWaveAnmRunning=false`） |
| WorkerWindow | `points=1732`、ColorTable miss 0、画像デコード OK |
| レンダラー/メインの JS 例外 | なし |
| WS 3 系統 | connected ログ確認 |

> 注: 検証初期に、SIGTERM で終了しなかった旧テストインスタンス（トレイ常駐アプリのため `close` が `preventDefault` される）がポート 9333 を保持し続け、以後の CDP 計測がその古いプロセスに向いていた。`background=true`・`hinanjo` レイヤ欠落等の初期観測はこの旧インスタンス由来で、残留プロセス停止後の再計測で全項目合格を確認した。

### 性能比較（同一ホスト・同時刻・60 秒ウォームアップ後の 30 秒平均）

| プロセス | 現行 v0.9.9（本番、稼働 18h42m） | 修正版（起動 90 秒） |
|---|---|---|
| メイン | CPU 10.0% / RSS 616MB | CPU 2.0% / RSS 434MB |
| MainWindow レンダラー | **CPU 31.4%** / RSS 658MB | **CPU 0.2%** / RSS 166MB |
| WorkerWindow レンダラー | CPU 1.6% / RSS 358MB | CPU 0.3% / RSS 116MB |
| GPU | CPU 0.4% / RSS 211MB | CPU 0.2% / RSS 196MB |
| 合計 RSS | 2110MB | 1167MB |

RSS は稼働時間が大きく異なるため直接比較できない（現行は 18 時間稼働で 353MB → 658MB に増加しており、長期増加の実測でもある）。CPU は同時刻の計測で、MainWindow レンダラーが 31.4% → 0.2%、メインが 10.0% → 2.0%。

### 成果物

- `dist/zeroquake_0.9.9_amd64.deb`（148,913,372 bytes）
- SHA256: `68288ad5564db3c9ec8311637873bf5f8b8ac0cb96b86d515162c55469b99e8f`
- asar 内の `src/*` がローカル作業ツリーと一致することを `cmp` で確認
