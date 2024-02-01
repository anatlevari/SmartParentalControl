# Smart Parental Control Chrome Extension

## Project Overview

This repository hosts a Chrome extension developed as a Capstone project for the Machine Learning Engineering (MLE) course at Fourthbrain. The extension's primary function is to identify and filter out images of weapons on web pages, enhancing browsing safety and content control.

### Example - a website with (left) and without (right) the extension
<img width="883" alt="Screenshot 2024-01-31 at 4 31 21 PM" src="https://github.com/anatlevari/SmartParentalControl/assets/26197668/16750add-e59f-477c-98f0-709e17a9dbc9">

## Datasets
The project utilizes two distinct datasets:
1. **General Weapons Dataset:** This dataset comprises six different types of weapons, providing a broad range of firearm imagery.
2. **Pistol-Specific Dataset:** A focused collection of images solely containing pistols.

## Methodology

### Data Analysis and Preparation
Before model training, extensive data analysis and cleaning were undertaken to ensure the quality and relevance of the training data.

### Model Development
Two separate models were developed using the YOLOv5 architecture, each tailored to one of the datasets:
- **General Weapons Model:** Trained on the general weapons dataset for a wide-ranging detection capability.
- **Pistol Model:** Specifically trained to recognize pistols, using the pistol-specific dataset.

### Visualizing the Pipeline
<img width="1249" alt="Pipeline" src="https://github.com/anatlevari/SmartParentalControl/assets/26197668/01d7eda9-0057-486c-8e12-53a7e87188dc">

### Inference Process
During the inference stage, the extension operates in a two-step process:
1. **Initial Screening:** The General Weapons Model is first applied to identify any of the six weapon types.
2. **Secondary Check:** If no weapon is detected in the first step, the Pistol Model is then used as a secondary measure.

## Extension Behavior
Upon detecting a weapon from either category, the offending image is immediately filtered out from the web page, making it disappear.

## Metrics and Performance
The metrics used for the YOLOv5 model were Precision, Recall, and mAP0.5. Their values were:

1. For the general weapon model - Precision = 0.996, Recall = 0.997, mAP0.5 = 0.995
2. For the pistol model -  Precision = 0.969, Recall = 0.971, mAP0.5 = 0.977

## Project Presentation
For a more detailed overview of this project, including its inception, development process, and future plans, see the project presentation [here](https://docs.google.com/presentation/d/1QmR-W6biuU89K94iHEZ_AdltQWM3O9bV/edit?usp=sharing&ouid=101461489104828949044&rtpof=true&sd=true)

## Installation steps
* Clone this repo or download & extract it.
* Load the "dist" folder using [these instrcutions](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked) for loading an unpacked extension.

