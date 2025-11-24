export const nanoid = (length = 10): string => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let id = '';
  for (let i = 0; i < length; i += 1) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
};





