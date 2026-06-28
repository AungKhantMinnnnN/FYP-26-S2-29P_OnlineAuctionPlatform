import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';

interface DatePickerFieldProps {
  label?: string;
  selected: Date | null;
  onChange: (date: Date | null) => void;
  error?: string;
  placeholderText?: string;
  minDate?: Date;
}

export default function DatePickerField({ label, selected, onChange, error, placeholderText, minDate }: DatePickerFieldProps) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>}
      <div className="relative">
        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
        <DatePicker
          selected={selected}
          onChange={onChange}
          showTimeSelect
          timeFormat="HH:mm"
          timeIntervals={15}
          dateFormat="MMMM d, yyyy h:mm aa"
          placeholderText={placeholderText}
          minDate={minDate}
          className={`w-full rounded-xl border bg-white px-3 py-2.5 pl-10 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
              : 'border-slate-200 focus:border-accent-500 focus:ring-accent-500/15'
          }`}
          wrapperClassName="w-full block"
        />
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
