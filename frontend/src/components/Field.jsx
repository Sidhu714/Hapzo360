// Label + input/select/textarea. Usage: <Field label="Name" required {...bind('name')} />
export default function Field({ label, as: Tag = 'input', children, ...props }) {
  return (
    <label className="block">
      <span className="label">{label}{props.required && <span className="text-red-500"> *</span>}</span>
      <Tag className="input" {...props}>{children}</Tag>
    </label>
  );
}
