/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    rootDir: '.',
    collectCoverageFrom: ['src/**/*.ts'],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 84,
            functions: 98,
            lines: 96,
            statements: 96,
        }
    },
    extensionsToTreatAsEsm: ['.ts'],
    maxWorkers: '50%',
    moduleDirectories: ['node_modules', 'src'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@vite/(.*)$': '<rootDir>/src/$1'
    },
    modulePaths: ['<rootDir>/src/'],
    preset: 'ts-jest/presets/default-esm',
    roots: ['<rootDir>/src/', '<rootDir>/tests/'],
    // setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    silent: false,
    testEnvironment: 'node',
    testEnvironmentOptions: {
        url: 'http://localhost'
    },
    testTimeout: 30000,
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.json',
                useESM: true,
                diagnostics: {
                    ignoreCodes: [1343]
                }
            }
        ]
    },
    // The following packages are ESM modules that need to be transformed by Jest
    // This is needed to handle the require() of ES Module issue
    transformIgnorePatterns: [
        'node_modules/(?!(dayjs|wrap-ansi|cliui|string-width|strip-ansi|ansi-regex|ansi-styles|eastasianwidth)/)'
    ],
    verbose: true,
    workerIdleMemoryLimit: '512MB',
}; 