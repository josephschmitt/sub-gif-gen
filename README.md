# Subtitle Gif Generator

NodeJS command-line utility to generate short looping clips with subtitles from your favorite
videos. This is a fun tool for creating looping scenes from your favorite, most quotable shows and
movies!

![This is ridiculous](http://cdn.joe.sh/projects/sub-gif-gen/stanley.gif)

## Installation

You have two options on how to install these scripts:

1. Clone the project and run the scripts directly

   ```sh
   git clone https://github.com/josephschmitt/sub-gif-gen.git
   cd sub-gif-gen
   npm install
   ```
2. Install the package into another NodeJS project
   ```sh
   npm install @joe-sh/sub-gif-gen --save-dev
   ```

Regardless of how you install the project, you'll have to make sure to use a version of the `ffmpeg`
binaries with `freetype` enabled so that we can render the subtitles without the need for any
other dependencies. On a Mac, you can do this by building `ffmpeg` from source with this option
using [`homebrew`](https://brew.sh):

```sh
brew install ffmpeg --with-libass --with-fontconfig --with-freetype
```

Or using this repo's `Brewfile`:
```sh
brew bundle
```

## Usage

Running from the cloned project:
```sh
./scripts/processVideos.js -d path/to/videos -- path/to/gif/output
```

If you installed as an `npm` dependency, you can either run in a `package.json` script:
```json
{
  "dependencies": {
    "sub-gif-gen": "^1.0.0"
  },
  "scripts": {
    "process": "gen-gifs -d path/to/videos -- path/to/gif/output"
  }
}
```
Or run the script directly in your shell:
```sh
./node_modues/.bin/.gen-gifs -d path/to/videos -- path/to/gif/output"
```

## CLI Flags

### Required
- `-d`, `--dir`: Directory containing your video files. Currently limited to only reading from
  external `.srt` files for subtitles. The `.srt` file must be named the same as the input source,
  but with the filename set to `.srt`.

### Optional Parameters
- `-l`, `--lang`: Language code if your `srt` subtitle files are named `{filename}.{lang}.srt`.
  Defaults to `'en'`.
- `-o`, `--offset`: Amount of time (in seconds) to offset the gif. By default this is zero, which
  means the gif is cropped to the exact timecode of the subtitle. You can use this value to extend
  the time of the clip by adding some time before and after the timecode from the subtitle file.
- `-x`, `--extensions`: Allowed extensions for the input file. Will use these to filter the input
  directory for videos. Defaults to `.mkv,.mp4,.mv4,.mov`.
- `-r`, `--formats`: The output formats for the looping clips. Defaults to `gif`. Can supply a
  comma-separated list of formats. Supports `gif,mp4,webm`.

### Optional Flags
- `-f`, `--flatten`: If set, will output all the output files to the given output directory.
  Otherwise it will group files into folders by the input filename. Defaults to false.
- `-k`, `--skipExisting`: If set, will skip processing if it finds a gif file already exists in the
  output directory.
- `-s`, `--sanitize`: If set, will sanitize output filenames from their original names to be
  url-safe using the [`url-safe-string`](https://www.npmjs.com/package/url-safe-string) package.

Use the `--` flag to denote the end of the options and then pass the directory to output your gifs.
The gifs will be output to a directory of the same name as the input file. The gifs are named the
same as the input source file, plus the start-time in milliseconds of the clip.

## Environment Flags

To provide a custom location for your `ffmpeg` binary, set the `FFMPEG_BIN` environment flag:
```sh
env FFMPEG_BIN='path/to/ffmpeg' ./scripts/processVideos.js -d path/to/videos -- path/to/gif/output
```
The default uses the `ffmpeg` exported in your `PATH`.

If something goes wrong, you can set a `LOGLEVEL` flag to see more verbose output:
```sh
env LOGLEVEL=verbose ./scripts/processVideos.js -d path/to/videos -- path/to/gif/output
```

## Index Generation

In addition to the gifs, the script produces a JSON file for each video of structured information
about the subtitles and what gifs they belong to. You can use this information along with the
`scripts/createIndex.js` script to produce a single structured data file of all your gifs and their
subs. This could be used to generate a data structure compatible with cloud-based search indexers,
such as [AWS's CloudSearch](https://aws.amazon.com/cloudsearch/).

The indexer takes in an [art](https://github.com/aui/art-template) template  and a glob of JSON
files to produce the index from. The glob should point to the `.json` index files produced by the
`scripts/processVideos.js` script, and you should use this data to produce a file that can be
ingested by your cloud-based search indexer. You can find an example template compatible with AWS's
CloudSearch in the `templates/` directory.

```sh
./scripts/createIndex.js --template templates/aws.cloudsearch.art --indexes **.json -- index.json
```

You'd then be able to upload `index.json` to AWS's CloudSearch to create a searchable gif index.
