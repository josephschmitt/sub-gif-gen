# Subtitle Gif Generator

NodeJS command-line utility to generate animated gif sequences of videos based with subtitles.
The gifs include the subtitle baked into the image and are on a loop. This is useful for creating
looping gifs of your favorite scenes from your favorite, most quotable shows and movies!

![This is ridiculous](http://cdn.joe.sh/projects/sub-gif-gen/stanley.gif)

## Installation

```sh
npm install # Install NodeJS dependencies
brew install imagemagick # Install imagemagic (currently required for subtitles)
```

## Usage

```sh
./scripts/processVideo.js -d path/to/videos -o path/to/gif/output
```

## CLI Flags

### Required
- `-d`, `--dir`: Directory containing your video files. Currently limited to `.mkv` files. Also
  currently limited to only reading from external `.srt` files.
- `-o`, `--output`: Directory to output your gifs. Will output the raw gifs to a `gif/` sub-folder
  and the final gifs with annotations/subtitles to the `annotated/` sub-folder

### Optional
- `-s`, `--skipExisting`: Will skip processing if it finds a gif or annotated gif file already
  exists in the output directory
- `-to`, `--offset`: Amount of time (in seconds) to offset the gif. By defaul this is zero, which
  means the gif is cropped to the exact timecode of the subtitle. You can use this value to extend
  the time of the clip by adding some time before and after the timecode from the subtitle file.
