const Button = ({ text }) => {
  return (
    <button className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition duration-300">
      {text}
    </button>
  );
};

export default Button;