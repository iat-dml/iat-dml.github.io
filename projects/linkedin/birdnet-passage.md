One to two weeks. That is how long it could take to run a single collection of bird recordings through an AI classifier on a desktop computer.

Acoustic sensors placed across field sites record around the clock and produce several terabytes of short audio files every month. Before the data can tell us which bird species are present, where and when, every one of those files has to pass through BirdNET, an AI model that recognises birds from their calls and songs.

Together with Marie Perennes and her group, the DML group at ZALF is building BirdNET-Passage: research software that runs BirdNET over thousands of files in parallel and keeps a record of every file. Each one ends up classified, retried after a temporary read error, or set aside as unreadable. If a run stops, it picks up where it left off instead of starting again.

The desktop version is working, and we are now bringing up support for the ZALF computing cluster. The code is being prepared for its first versioned release very soon, but is not yet publicly available.

This is the kind of work DML does for IAT researchers: taking a method that works on a small scale and making it reliable at the scale real monitoring data arrives in.

Working with acoustic monitoring data, or running a model over many files? We would like to hear from you.

https://iat-dml.github.io/projects/birdnet-passage.html

#Bioacoustics #ResearchSoftware #Biodiversity #ZALF #OpenScience
