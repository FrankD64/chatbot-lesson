# Your First Chatbot

A two-lesson Python micromodule for Grade 7 (ages 12 to 13) by Frank Deng.

- **Lesson 1, Make the Computer Talk:** `print()` and strings
- **Lesson 2, Make the Computer Listen:** `input()` and variables

Python runs inside the learner's browser (Pyodide), so there is nothing to install, no account to make, and nothing learners type is sent anywhere.

## Pages and files

| File | What it is |
| --- | --- |
| `index.html` | Home page with the intro video, its transcript, and the two lessons |
| `lesson1.html` | Lesson 1: embedded slides, Run It, Change It (Activity 1) and Bug Hunt (Activity 2) |
| `lesson2.html` | Lesson 2: embedded slides and Chatbot Builder (Activity 3) |
| `assets/reference.html` | The Error Decoder and Key Words shown in the sidebar on both lesson pages. Edit this one file to change them |
| `assets/slides/` | The two slide decks as PowerPoint files, offered as downloads on the lesson pages |

## Adding the slides

1. Upload each `.pptx` from `assets/slides/` to Google Drive and open it with Google Slides.
2. In Google Slides, choose **File > Share > Publish to web**, then **Embed**, and click **Publish**.
3. Copy the link inside `src="..."` from the embed code.
4. In `lesson1.html` or `lesson2.html`, paste it between the quotes in `data-src=""`, then commit.

After you edit a deck in Google Slides, the website shows the change automatically. Re-download it as a `.pptx` and replace the file in `assets/slides/` if you want the download to match.

## Showing your own Error Decoder and Key Words sheets

1. Upload `Error_Decoder.docx` and `Key_Words.docx` to Google Drive and open each with Google Docs.
2. In each doc, choose **File > Share > Publish to web**, then click **Publish**, and copy the link.
3. In `assets/reference.html`, paste each link between the quotes after `data-doc-src` on the matching panel (`ref-decoder` or `ref-words`), then commit.

The sidebar then shows your Google Docs, and any edits you make there appear on the site automatically. Until a link is added, the sidebar shows the built-in version.

## Adding the intro video

1. Upload the video to YouTube (Unlisted is fine) and add corrected captions.
2. Copy the video ID: for `https://www.youtube.com/watch?v=abc123XYZ`, the ID is `abc123XYZ`.
3. In `index.html`, paste the ID between the quotes in `data-youtube-id=""`, then commit.
