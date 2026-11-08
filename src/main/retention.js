/**
 * メインプロセスの保持データの件数上限と刈り込み処理。fork 独自（ukaji3/Zero-Quake、Issue #24）。
 * 長時間の稼働で単調に増え続けるデータ構造を有界化する。
 * upstream のモジュールと分けて置き、upstream 取り込み時の衝突を減らす。
 */

/** 保持データの上限件数 */
export const RETENTION_LIMITS = {
  /** EQInfoData（地震イベント数）。eqInfo.jma の上限がこれを超える場合はそちらに合わせる */
  EQInfoData: 300,
  /** eqInfo.jma の下限（実際の上限は max(表示件数 × 2, この値)） */
  eqInfoJmaMin: 100,
  /** EQCount_data（地震回数に関する情報のイベント数） */
  EQCount: 100,
  /** EEW_Storage（緊急地震速報のイベント数） */
  EEWStorage: 50,
  /** EEW_Storage[].data / EarlyEst_Data[].data（1 イベントあたりの報数） */
  EEWStorageData: 30,
  /** EarlyEst_Data（Early-Est のイベント数） */
  EarlyEst: 100,
  /** Tsunami_Data（津波情報の報数） */
  Tsunami: 100,
  /** NankaiTroughInfoAll / HokkaidoSanrikuInfoAll / KatsudoJokyoInfoAll（各報数） */
  InfoAll: 50,
  /** jmaXML_Fetched（取得済み気象庁 XML の URL 数） */
  jmaXMLFetched: 2000,
};

/**
 * オブジェクト（キー→要素）の保持件数を上限以下に刈り込む。
 * 上限超過分は sortKey の値が小さい（古い）ものから削除する。
 * @param {Record<string, object>} obj 対象オブジェクト
 * @param {number} max 最大保持件数
 * @param {(item: object) => number} sortKey 並び替えキー（大きいほど新しい）
 * @returns {number} 削除件数
 */
export function pruneObjectByCount(obj, max, sortKey) {
  var keys = Object.keys(obj);
  if (keys.length <= max) return 0;
  keys.sort(function (a, b) { return sortKey(obj[a]) - sortKey(obj[b]); });
  var removeCount = keys.length - max;
  for (let i = 0; i < removeCount; i++) delete obj[keys[i]];
  return removeCount;
}

/**
 * 配列の保持件数を上限以下に刈り込む。
 * 上限超過分は sortKey の値が小さい（古い）ものから削除し、元の配列を in-place で更新する（要素の順序は保つ）。
 * 同じ値が同じ大きさの場合は、配列の先頭に近いものを残す。
 * 要素の同一性ではなく位置で判定するため、同じオブジェクトが複数回入っていても上限を超えない（Issue #36）。
 * @param {object[]} arr 対象配列
 * @param {number} max 最大保持件数
 * @param {(item: object) => number} sortKey 並び替えキー（大きいほど新しい）
 * @returns {number} 削除件数
 */
export function pruneArrayByCount(arr, max, sortKey) {
  if (arr.length <= max) return 0;
  var keys = arr.map(sortKey);
  var order = keys.map(function (_key, index) { return index; });
  order.sort(function (a, b) { return (keys[b] - keys[a]) || (a - b); });
  var keep = new Set(order.slice(0, Math.max(0, max)));
  var before = arr.length;
  var write = 0;
  for (let read = 0; read < arr.length; read++) {
    if (keep.has(read)) arr[write++] = arr[read];
  }
  arr.length = write;
  return before - arr.length;
}

/**
 * 配列の先頭（最古）から削除して件数を上限以下にする（挿入順が時系列の配列向け）。
 * @param {unknown[]} arr 対象配列
 * @param {number} max 最大保持件数
 */
export function truncateOldest(arr, max) {
  if (arr.length > max) arr.splice(0, arr.length - max);
}
