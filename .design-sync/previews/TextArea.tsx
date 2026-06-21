import { TextArea } from 'kaitori-saihan-app';

export function Default() {
  return (
    <div className="max-w-sm">
      <TextArea
        rows={3}
        defaultValue={'立地良好。山室中部小学校まで徒歩1分圏内。\n水回りを中心に約800万円のリフォームを実施予定。'}
      />
    </div>
  );
}
export function Empty() {
  return <div className="max-w-sm"><TextArea rows={3} placeholder="売却希望理由・注意点などを入力" /></div>;
}
