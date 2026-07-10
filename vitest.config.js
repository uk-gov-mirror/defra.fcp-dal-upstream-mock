export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html']
    },
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.js'],
    setupFiles: ['./test/setup-schema-matcher.js']
  }
}
