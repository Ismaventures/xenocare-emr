// Jest setup file - runs before each test
// Sets up mock environment variables for testing

// Mock Supabase environment variables
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key-for-testing-purposes-only';

// Mock ICD environment variables
process.env.ICD_CLIENT_ID = 'test-icd-client-id';
process.env.ICD_CLIENT_SECRET = 'test-icd-client-secret';

// Mock application settings
process.env.SHOW_DEMO_MODE = 'true';

// Mock window.electron for IPC calls
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      sendMessage: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      invoke: jest.fn(),
    },
    icd: {
      search: jest.fn().mockResolvedValue([]),
      getCode: jest.fn().mockResolvedValue(null),
      getStatus: jest.fn().mockResolvedValue({ available: true }),
    },
    pdf: {
      saveAndOpen: jest.fn().mockResolvedValue({ success: true }),
    },
    html: {
      saveAndOpen: jest.fn().mockResolvedValue({ success: true }),
    },
    admin: {
      isAvailable: jest.fn().mockResolvedValue(true),
      createUser: jest
        .fn()
        .mockResolvedValue({ success: true, userId: 'test-user-id' }),
      deleteUser: jest.fn().mockResolvedValue({ success: true }),
      updateUser: jest.fn().mockResolvedValue({ success: true }),
    },
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
