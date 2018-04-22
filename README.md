# Subtitle Gif Generator

NodeJS command-line utility to generate animated gif sequences of videos based with subtitles.
The gifs include the subtitle baked into the image and are on a loop. This is useful for creating
looping gifs of your favorite scenes from your favorite, most quotable shows and movies!

![This is ridiculous](http://cdn.joe.sh/projects/sub-gif-gen/stanley.gif)

## Installation

```sh
npm install # Install NodeJS dependencies

# In order to burn the subtitles into the gif, you'll have to build ffmpeg with freetype enabled.
# This is so we don't need to install ImageMagick and do another slow processing step
brew install ffmpeg --with-libass --with-fontconfig --with-freetype
```

## Usage

Running from the cloned project
```sh
./scripts/processVideos.js -d path/to/videos -- path/to/gif/output
```

Installed as an npm dependency and running from a package.json script
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

To provide a custom location for your `ffmpeg` binary, set the `FFMPEG_BIN` environment flag:

```sh
env FFMPEG_BIN='path/to/ffmpeg' ./scripts/processVideos.js -d path/to/videos -o path/to/gif/output
```

## CLI Flags

### Required
- `-d`, `--dir`: Directory containing your video files. Currently limited to `.mkv` files. Also
  currently limited to only reading from external `.srt` files for subtitles. The `.srt` file must
  be named the same as the `.mkv` source, but with the filename set to `.srt`.

### Optional
- `-s`, `--skipExisting`: Will skip processing if it finds a gif or annotated gif file already
  exists in the output directory
- `-o`, `--offset`: Amount of time (in seconds) to offset the gif. By defaul this is zero, which
  means the gif is cropped to the exact timecode of the subtitle. You can use this value to extend
  the time of the clip by adding some time before and after the timecode from the subtitle file.

Use the `--` flag to denote the end of the options and then pass the directory to output your gifs.
The gifs will be output in a directory named by input file. The gifs are named the same as the mkv
source file plus the star-time in miliseconds of the clip.
