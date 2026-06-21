import { Toggle } from 'kaitori-saihan-app';
const noop = () => {};

export function On() {
  return <div className="max-w-xs"><Toggle checked={true} onChange={noop} label="エレベーター有" /></div>;
}
export function Off() {
  return <div className="max-w-xs"><Toggle checked={false} onChange={noop} label="角部屋" /></div>;
}
export function Checklist() {
  return (
    <div className="max-w-sm space-y-3">
      <Toggle checked={true} onChange={noop} label="スーパーが徒歩15分圏内" />
      <Toggle checked={true} onChange={noop} label="駐車場を確保できる" />
      <Toggle checked={false} onChange={noop} label="事故物件ではない" />
    </div>
  );
}
