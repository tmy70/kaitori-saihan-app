import { Field, TextInput } from 'kaitori-saihan-app';

export function Default() {
  return (
    <div className="max-w-xs">
      <Field label="案件名">
        <TextInput placeholder="例：富山市〇〇町 戸建" />
      </Field>
    </div>
  );
}

export function WithHint() {
  return (
    <div className="max-w-xs">
      <Field label="販売価格" hint="税抜・万円単位で入力してください">
        <TextInput defaultValue="1680" />
      </Field>
    </div>
  );
}
