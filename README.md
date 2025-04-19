# Cabazooka

Cabazooka is a library that provides a framework for configuring and processing command-line arguments related to file operations. It's designed to be integrated into command-line tools that need to handle input files and create structured output.

## Overview

Cabazooka doesn't help you think. It removes what gets in the way by providing a standardized approach to:
- Parsing and validating command-line arguments
- Processing input files according to configurable rules
- Organizing output with consistent directory structures and filename conventions

This library serves as the foundation for multiple command-line tools that require structured file organization capabilities.

## Key Features

- **Configurable Command-Line Interface**: Easy integration with the Commander.js library
- **Flexible Directory Structure**: Support for organizing files by year, month, or day
- **Customizable Filenames**: Include date, time, and subject in filenames
- **File Type Filtering**: Process only specific file extensions
- **Timezone Support**: Correctly handle file timestamps across different timezones
- **Recursive Processing**: Option to process files in subdirectories

## Installation

```bash
npm install @tobrien/cabazooka
```

## Usage

### Integrating with Your CLI Tool

```javascript
import { Command } from 'commander';
import * as Cabazooka from '@tobrien/cabazooka';

// Create a new instance with options
const instance = Cabazooka.create({
  defaults: {
    timezone: 'America/New_York',
    extensions: ['md', 'txt'],
    outputStructure: 'month',
  }
});

// Configure your command
const program = new Command();
await instance.configure(program);

// Parse arguments
program.parse(process.argv);
const options = program.opts();

// Validate options
const config = await instance.validate(options);

// Use the operator to process files
const operator = await instance.operate(config);
await operator.process(async (file) => {
  // Your file processing logic here
});
```

### Available Options

When integrated, your CLI tool will have these options available:

| Option | Description | Default |
|--------|-------------|---------|
| `--timezone <timezone>` | Timezone for date calculations | Etc/UTC |
| `-r, --recursive` | Process all files in subdirectories | false |
| `-o, --output-directory <path>` | Output directory | ./ |
| `-i, --input-directory <path>` | Input directory | ./ |
| `--output-structure <type>` | Directory structure (none/year/month/day) | month |
| `--filename-options [options...]` | Filename format options (date,time,subject) | date subject |
| `--extensions [extensions...]` | File extensions to process | md |

## Output Structure

Cabazooka supports organizing files based on the `outputStructure` option:

- **none**: All files placed directly in output directory
- **year**: Files organized in yearly folders (YYYY/)
- **month**: Files organized in yearly and monthly folders (YYYY/MM/)
- **day**: Files organized in yearly, monthly, and daily folders (YYYY/MM/DD/)

## Filename Format

Filenames are constructed using the options specified in `filenameOptions`:

- **date**: Includes date in format YYYY-MM-DD (adjusts based on output structure)
- **time**: Includes time in format HHmm
- **subject**: Includes sanitized subject from the file content or metadata

## Dependencies

Cabazooka leverages several libraries:
- commander - for command-line interface
- dayjs - for date manipulation
- winston - for logging
- glob - for file discovery

## Development

```bash
# Build the project
npm run build

# Run tests
npm test

# Run in development mode
npm run dev
```

## License

Apache-2.0

## Author

Tim O'Brien <tobrien@discursive.com>
