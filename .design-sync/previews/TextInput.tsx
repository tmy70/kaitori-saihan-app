import { TextInput } from 'kaitori-saihan-app';

export function Placeholder() {
  return <div className="max-w-xs"><TextInput placeholder="物件所在地を入力" /></div>;
}
export function Filled() {
  return <div className="max-w-xs"><TextInput defaultValue="富山市天正寺1076" /></div>;
}
export function DateField() {
  return <div className="max-w-xs"><TextInput type="date" defaultValue="2026-05-29" /></div>;
}
