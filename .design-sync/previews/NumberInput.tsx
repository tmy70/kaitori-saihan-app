import { NumberInput } from 'kaitori-saihan-app';
const noop = () => {};

export function Money() {
  return <div className="max-w-xs"><NumberInput value={1680} onChangeNumber={noop} /></div>;
}
export function Percent() {
  return <div className="max-w-xs"><NumberInput value={13} onChangeNumber={noop} suffix="%" /></div>;
}
export function Days() {
  return <div className="max-w-xs"><NumberInput value={90} onChangeNumber={noop} suffix="日" /></div>;
}
