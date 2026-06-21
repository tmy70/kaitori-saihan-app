import { Modal, Button } from 'kaitori-saihan-app';
const noop = () => {};

// 実際の Modal は `position: fixed` のオーバーレイ。静的プレビューでは
// transform を持つ相対配置ラッパーに入れ、固定要素をラッパー基準で描画する
// （コンポーネント自体は無改変＝合成のみ）。スマホ表示と同じボトムシート体裁。
export function Confirm() {
  return (
    <div
      style={{
        position: 'relative',
        transform: 'translateZ(0)',
        height: 300,
        width: '100%',
        maxWidth: 600,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <Modal
        open={true}
        onClose={noop}
        title="案件を削除しますか？"
        footer={
          <>
            <Button variant="secondary" onClick={noop}>キャンセル</Button>
            <Button variant="danger" onClick={noop}>削除する</Button>
          </>
        }
      >
        「富山市〇〇町 戸建」を削除します。この操作は取り消せません。
      </Modal>
    </div>
  );
}
