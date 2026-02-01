import React from 'react';

interface Props { value: string; onChange: (v:string)=>void; }

export default function LanguageSelector({ value, onChange }: Props) {
  return (
    <select aria-label="Language" value={value} onChange={(e)=>onChange(e.target.value)}>
      <option value="vi">Tiếng Việt</option>
      <option value="en">English</option>
    </select>
  );
}
