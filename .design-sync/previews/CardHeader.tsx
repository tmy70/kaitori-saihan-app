import { Card, CardHeader, Badge } from 'kaitori-saihan-app';

export function Default() {
  return (
    <Card className="max-w-sm">
      <CardHeader title="取得原価" desc="物件タイプ別の費目合計" />
      <div className="p-4 text-sm text-muted">費目を入力すると合計が自動計算されます。</div>
    </Card>
  );
}

export function WithAction() {
  return (
    <Card className="max-w-sm">
      <CardHeader title="購入チェックリスト" desc="各項目 OK / NG を切替" action={<Badge tone="good">OK 23 / 27</Badge>} />
      <div className="p-4 text-sm text-muted">満たさない項目を可視化します。</div>
    </Card>
  );
}
