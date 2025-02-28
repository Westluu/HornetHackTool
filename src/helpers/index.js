export const getRandomColors = () => {
  let arr = [
    'bg-red-500',
    'bg-blue-500',
    'bg-black-500',
    'bg-blue-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-gray-500',
  ];

  let random = Math.floor(Math.random() * arr.length);

  return arr[random];
};
