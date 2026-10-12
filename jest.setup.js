// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// RNTL 12 ships these matchers but does not install them on import. v13+ does.
require('@testing-library/react-native/extend-expect');
