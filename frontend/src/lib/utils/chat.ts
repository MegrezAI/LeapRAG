const oldReg = /(#{2}\d+\${2})/g;

// To be compatible with the old index matching mode
export const replaceTextByOldReg = (text: string) => {
  return text.replace(oldReg, function (substring) {
    return `~~${substring.slice(2, -2)}==`;
  });
};
