import { Button } from 'kaitori-saihan-app';

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">保存する</Button>
      <Button variant="secondary">キャンセル</Button>
      <Button variant="accent">サンプル読込</Button>
      <Button variant="ghost">詳細</Button>
      <Button variant="danger">削除する</Button>
    </div>
  );
}

export function WithIcon() {
  return (
    <Button variant="primary">
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
      新規案件
    </Button>
  );
}

export function Disabled() {
  return (
    <div className="flex items-center gap-3">
      <Button variant="primary" disabled>保存する</Button>
      <Button variant="secondary" disabled>キャンセル</Button>
    </div>
  );
}
