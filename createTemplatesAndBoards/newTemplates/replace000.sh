#!/bin/bash
for file in *_000.json; do
  new_file="${file%_000.json}_999.json"
  mv "$file" "$new_file"
  # echo "$file" "$new_file"
done
for file in *_000.svg; do
  new_file="${file%_000.svg}_999.svg"
  mv "$file" "$new_file"
  # echo "$file" "$new_file"
done

