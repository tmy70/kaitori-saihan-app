import { Badge } from 'kaitori-saihan-app';

export function Tones() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="good">良好</Badge>
      <Badge tone="warn">要検討</Badge>
      <Badge tone="bad">要注意</Badge>
      <Badge tone="neutral">建物リフォーム再販</Badge>
      <Badge tone="brand">ゆかり株式会社</Badge>
    </div>
  );
}
export function Dark() {
  return (
    <div className="dark flex flex-wrap items-center gap-2 rounded-2xl bg-bg p-4">
      <Badge tone="good">良好</Badge>
      <Badge tone="warn">要検討</Badge>
      <Badge tone="bad">要注意</Badge>
      <Badge tone="brand">ViVi不動産株式会社</Badge>
    </div>
  );
}
