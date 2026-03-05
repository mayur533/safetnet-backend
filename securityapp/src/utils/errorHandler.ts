import Toast from 'react-native-root-toast';

export function handleAxiosError(error: any) {
  // Log full backend response for debugging
  console.error('Full backend response:', error.response?.data);

  // Extract detailed error messages from error.response.data
  let errorMessage = 'An error occurred';

  if (error.response?.data) {
    const data = error.response.data;

    if (typeof data === 'string') {
      errorMessage = data;
    } else if (typeof data === 'object' && data !== null) {
      const messages: string[] = [];

      for (const key in data) {
        const value = data[key];

        if (Array.isArray(value)) {
          // Handle multiple errors for a field
          value.forEach(err => messages.push(`${key}: ${err}`));
        } else if (typeof value === 'string') {
          messages.push(`${key}: ${value}`);
        } else {
          // Handle nested objects or other types
          messages.push(`${key}: ${JSON.stringify(value)}`);
        }
      }

      if (messages.length > 0) {
        errorMessage = messages.join('\n');
      }
    }
  }

  // Show user-friendly message using Toast.show
  Toast.show(errorMessage, {
    duration: Toast.durations.LONG,
    position: Toast.positions.TOP,
    backgroundColor: '#FF6B6B', // Error red color
    textColor: 'white',
    shadow: true,
    animation: true,
    hideOnPress: true,
    delay: 0,
  });
}
