import { Card } from 'kaitori-saihan-app';

export function Basic() {
  return (
    <Card className="max-w-sm p-4">
      <p className="text-sm font-bold text-fg">富山市〇〇町 戸建</p>
      <p className="mt-1 text-xs text-muted">建物リフォーム再販 ・ 更新 2026/06/21</p>
    </Card>
  );
}

export function KpiCard() {
  return (
    <Card className="max-w-sm p-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-surface-2 px-2 py-2">
          <div className="text-[10px] text-muted">販売価格</div>
          <div className="text-sm font-bold text-fg">1,680万</div>
        </div>
        <div className="rounded-xl bg-surface-2 px-2 py-2">
          <div className="text-[10px] text-muted">営業利益</div>
          <div className="text-sm font-bold text-emerald-600">212万</div>
        </div>
        <div className="rounded-xl bg-surface-2 px-2 py-2">
          <div className="text-[10px] text-muted">利益率</div>
          <div className="text-sm font-bold text-emerald-600">13%</div>
        </div>
      </div>
    </Card>
  );
}

export function Dark() {
  return (
    <div className="dark rounded-2xl bg-bg p-4">
      <Card className="max-w-sm p-4">
        <p className="text-sm font-bold text-fg">ダークテーマ</p>
        <p className="mt-1 text-xs text-muted">surface / border / fg がテーマ変数で切替わります</p>
      </Card>
    </div>
  );
}
