import { useState } from "react";

const InputField = ({ label, type, placeholder }) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="relative">
        <input
          type={isPassword && showPassword ? "text" : type}
          placeholder={placeholder}
          className="w-full border border-gray-300 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {isPassword && (
          <span
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 cursor-pointer text-lg"
          >
            {showPassword ? "🙈" : "👁️"}
          </span>
        )}
      </div>
    </div>
  );
};

export default InputField;
