const generateRandomNumber = () => {
  let result = "M";
  for (let i = 0; i < 5; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
};

export default generateRandomNumber