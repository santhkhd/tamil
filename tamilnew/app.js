document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let allMovies = [];
    let activeGenre = 'all';
    let searchQuery = '';
    let sortBy = 'recent';
    let featuredMovie = null;

    // DOM Elements
    const searchInput = document.getElementById('movieSearch');
    const totalCountText = document.getElementById('totalMoviesCount');
    const heroSection = document.getElementById('heroSection');
    const heroTitle = document.getElementById('heroTitle');
    const heroYear = document.getElementById('heroYear');
    const heroQuality = document.getElementById('heroQuality');
    const heroGenre = document.getElementById('heroGenre');
    const heroPlot = document.getElementById('heroPlot');
    const heroPlayBtn = document.getElementById('heroPlayBtn');
    const heroDetailsBtn = document.getElementById('heroDetailsBtn');

    const genreChipsContainer = document.getElementById('genreChipsContainer');
    const sortBySelect = document.getElementById('sortBy');
    const moviesGrid = document.getElementById('moviesGrid');

    // Modal Elements
    const movieModal = document.getElementById('movieModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const mainVideoPlayer = document.getElementById('mainVideoPlayer');
    const playerErrorPanel = document.getElementById('playerErrorPanel');
    const playerErrorText = document.getElementById('playerErrorText');
    const retryStreamBtn = document.getElementById('retryStreamBtn');
    const qualitySelectors = document.getElementById('qualitySelectors');

    const modalMovieTitle = document.getElementById('modalMovieTitle');
    const modalYear = document.getElementById('modalYear');
    const modalQuality = document.getElementById('modalQuality');
    const modalGenre = document.getElementById('modalGenre');
    const modalPlot = document.getElementById('modalPlot');
    const modalActors = document.getElementById('modalActors');
    const modalActorsGroup = document.getElementById('modalActorsGroup');
    const modalDirector = document.getElementById('modalDirector');
    const modalDirectorGroup = document.getElementById('modalDirectorGroup');
    const modalMusic = document.getElementById('modalMusic');
    const modalMusicGroup = document.getElementById('modalMusicGroup');
    const modalProduction = document.getElementById('modalProduction');
    const modalProductionGroup = document.getElementById('modalProductionGroup');
    const downloadsList = document.getElementById('downloadsList');

    // Default Fallback Movie Poster
    const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=400&q=80';

    // 1. Initial Load
    async function loadDatabase() {
        try {
            const response = await fetch('./movies.json');
            if (!response.ok) {
                throw new Error('Failed to fetch movies.json');
            }
            allMovies = await response.json();

            // Clean up movies list (handle empty fields)
            allMovies = allMovies.map(movie => ({
                ...movie,
                title: movie.title || 'Untitled Movie',
                year: movie.year || 'Unknown',
                genre: movie.genre || 'General',
                plot: movie.plot || 'No plot summary is available for this film.',
                actors: movie.actors || '',
                director: movie.director || '',
                music: movie.music || '',
                production: movie.production || ''
            }));

            totalCountText.textContent = `Database: ${allMovies.length} Movies`;

            // Build Dynamic Genres and featured slide
            setupGenreFilters();
            selectFeaturedMovie();

            // Initial Render
            filterAndRenderMovies();

        } catch (error) {
            console.error('Error loading database:', error);
            moviesGrid.innerHTML = `
                <div class="grid-message-container">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p style="margin-top: 1rem; color: var(--error);">Failed to load library data files.</p>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">${error.message}</p>
                </div>
            `;
        }
    }

    // 2. Select Featured Movie for Hero Banner
    function selectFeaturedMovie() {
        // Find a recent movie that has a poster and plot summary
        const suitableFeatured = allMovies.find(m =>
            m.pic &&
            m.plot &&
            m.plot.length > 50 &&
            m.actors &&
            (m.year === '2026' || m.year === '2025')
        );

        // Fallback to first movie in the database
        featuredMovie = suitableFeatured || allMovies[0];

        if (featuredMovie) {
            // Update Hero Banner
            heroTitle.textContent = featuredMovie.title;
            heroYear.textContent = featuredMovie.year;
            heroQuality.textContent = featuredMovie.quality || 'HDRip';
            heroGenre.textContent = featuredMovie.genre;
            heroPlot.textContent = featuredMovie.plot;

            // Set image background
            const backdropImg = featuredMovie.pic || featuredMovie.imagePath || FALLBACK_POSTER;
            heroSection.style.backgroundImage = `url('${backdropImg}')`;

            // Wire buttons
            heroPlayBtn.onclick = () => openMovieModal(featuredMovie);
            heroDetailsBtn.onclick = () => openMovieModal(featuredMovie);
        }
    }

    // 3. Extract Unique Genres & Create Filter Chips
    function setupGenreFilters() {
        const genreSet = new Set();

        allMovies.forEach(movie => {
            if (movie.genre) {
                movie.genre.split(',').forEach(g => {
                    const cleanGenre = g.trim();
                    if (cleanGenre) {
                        genreSet.add(cleanGenre);
                    }
                });
            }
        });

        const sortedGenres = Array.from(genreSet).sort();

        // Create Chips
        sortedGenres.forEach(genre => {
            const btn = document.createElement('button');
            btn.className = 'chip';
            btn.textContent = genre;
            btn.setAttribute('data-genre', genre);
            btn.onclick = () => {
                // Remove active class from old chips
                document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                activeGenre = genre;
                filterAndRenderMovies();
            };
            genreChipsContainer.appendChild(btn);
        });

        // Wire "All Genres" Chip
        const allChip = genreChipsContainer.querySelector('[data-genre="all"]');
        allChip.onclick = () => {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            allChip.classList.add('active');
            activeGenre = 'all';
            filterAndRenderMovies();
        };
    }

    // 4. Filter, Sort and Render Movie Catalog Grid
    function filterAndRenderMovies() {
        let results = [...allMovies];

        // Filter by Genre
        if (activeGenre !== 'all') {
            results = results.filter(movie =>
                movie.genre.toLowerCase().includes(activeGenre.toLowerCase())
            );
        }

        // Filter by Search Query
        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase().trim();
            results = results.filter(movie =>
                movie.title.toLowerCase().includes(q) ||
                movie.actors.toLowerCase().includes(q) ||
                movie.director.toLowerCase().includes(q) ||
                movie.genre.toLowerCase().includes(q) ||
                movie.plot.toLowerCase().includes(q)
            );
        }

        // Sort Results
        if (sortBy === 'year-desc') {
            results.sort((a, b) => b.year.localeCompare(a.year));
        } else if (sortBy === 'year-asc') {
            results.sort((a, b) => a.year.localeCompare(b.year));
        } else if (sortBy === 'title-asc') {
            results.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortBy === 'title-desc') {
            results.sort((a, b) => b.title.localeCompare(a.title));
        }

        renderGrid(results);
    }

    // 5. Render Grid Cards HTML
    function renderGrid(moviesList) {
        moviesGrid.innerHTML = '';

        if (moviesList.length === 0) {
            moviesGrid.innerHTML = `
                <div class="grid-message-container">
                    <svg class="empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    <h3>No movies found</h3>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.25rem;">Try adjusting your keywords or active filter tags.</p>
                </div>
            `;
            return;
        }

        moviesList.forEach(movie => {
            const card = document.createElement('div');
            card.className = 'movie-card';

            // Poster URL
            const posterSrc = movie.pic || movie.imagePath || FALLBACK_POSTER;
            const qualityBadge = movie.quality || 'HDRip';

            card.innerHTML = `
                <div class="card-poster-container">
                    <img class="card-poster" src="${posterSrc}" alt="${movie.title}" loading="lazy" 
                         onerror="this.onerror=null; this.src='${FALLBACK_POSTER}';">
                    <div class="card-badge-top-left">
                        <span class="badge-pill quality">${qualityBadge}</span>
                    </div>
                    <div class="card-badge-top-right">
                        <span class="badge-pill year">${movie.year}</span>
                    </div>
                    <div class="card-overlay">
                        <div class="play-icon-glow">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        </div>
                    </div>
                </div>
                <div class="card-info">
                    <h4 class="card-title" title="${movie.title}">${movie.title}</h4>
                    <div class="card-meta">
                        <span class="card-genre" title="${movie.genre}">${movie.genre}</span>
                        <span>${movie.duration ? movie.duration : ''}</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => openMovieModal(movie));
            moviesGrid.appendChild(card);
        });
    }

    // 6. Modal Open & Media Stream Setup
    function openMovieModal(movie) {
        // Reset Video Player state
        mainVideoPlayer.pause();
        mainVideoPlayer.src = '';
        mainVideoPlayer.load();
        playerErrorPanel.style.display = 'none';

        // Metadata populate
        modalMovieTitle.textContent = movie.title;
        modalYear.textContent = movie.year;
        modalQuality.textContent = movie.quality || 'HDRip';
        modalGenre.textContent = movie.genre;
        modalPlot.textContent = movie.plot;

        // Conditional details displaying
        if (movie.actors) {
            modalActors.textContent = movie.actors;
            modalActorsGroup.style.display = 'flex';
        } else {
            modalActorsGroup.style.display = 'none';
        }

        if (movie.director) {
            modalDirector.textContent = movie.director;
            modalDirectorGroup.style.display = 'flex';
        } else {
            modalDirectorGroup.style.display = 'none';
        }

        if (movie.music) {
            modalMusic.textContent = movie.music;
            modalMusicGroup.style.display = 'flex';
        } else {
            modalMusicGroup.style.display = 'none';
        }

        if (movie.production) {
            modalProduction.textContent = movie.production;
            modalProductionGroup.style.display = 'flex';
        } else {
            modalProductionGroup.style.display = 'none';
        }

        // Set player poster background
        mainVideoPlayer.poster = movie.pic || movie.imagePath || '';

        // Extract available playback links
        const streamOptions = [];

        // Checking for qualities nested object
        if (movie.qualities) {
            if (movie.qualities.Q720p) streamOptions.push({ resolution: '720p', url: movie.qualities.Q720p });
            if (movie.qualities.Q480p) streamOptions.push({ resolution: '480p', url: movie.qualities.Q480p });
            if (movie.qualities.Q360p) streamOptions.push({ resolution: '360p', url: movie.qualities.Q360p });
        }

        // Fallbacks for straight moviePath variables
        if (streamOptions.length === 0) {
            if (movie.moviePath720p) streamOptions.push({ resolution: '720p', url: movie.moviePath720p });
            if (movie.moviePath480p) streamOptions.push({ resolution: '480p', url: movie.moviePath480p });
            if (movie.moviePath360p) streamOptions.push({ resolution: '360p', url: movie.moviePath360p });
            if (movie.moviePath && streamOptions.length === 0) streamOptions.push({ resolution: 'Standard', url: movie.moviePath });
        }

        // Build Stream Select Buttons and Download Buttons
        qualitySelectors.innerHTML = '';
        downloadsList.innerHTML = '';

        if (streamOptions.length > 0) {
            // Populate Streaming selectors
            streamOptions.forEach((option, idx) => {
                const streamBtn = document.createElement('button');
                streamBtn.className = `quality-btn ${idx === 0 ? 'active' : ''}`;
                streamBtn.textContent = option.resolution;
                streamBtn.onclick = () => selectStreamQuality(option.url, streamBtn);
                qualitySelectors.appendChild(streamBtn);

                // Populate Downloads rows
                const dlRow = document.createElement('div');
                dlRow.className = 'download-row';

                // Get size if defined
                let sizeStr = '';
                if (movie.qualities && movie.qualities.Sizes && movie.qualities.Sizes['Q' + option.resolution]) {
                    sizeStr = movie.qualities.Sizes['Q' + option.resolution];
                } else if (movie.qualities && movie.qualities.Sizes && movie.qualities.Sizes[option.resolution]) {
                    sizeStr = movie.qualities.Sizes[option.resolution];
                }

                dlRow.innerHTML = `
                    <div>
                        <span class="dl-quality">${option.resolution.toUpperCase()} Stream</span>
                        ${sizeStr ? `<span class="dl-size">(${sizeStr})</span>` : ''}
                    </div>
                    <a href="${option.url}" class="btn-download" target="_blank" download="${movie.title.replace(/\s+/g, '_')}_${option.resolution}">
                        Download
                    </a>
                `;
                downloadsList.appendChild(dlRow);
            });

            // Play the first available quality stream by default
            playVideoStream(streamOptions[0].url);
        } else {
            qualitySelectors.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">No online stream streams available.</span>';
            downloadsList.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">No direct download files found.</span>';
        }

        // Display Modal
        movieModal.classList.add('open');
        document.body.style.overflow = 'hidden'; // block page scroll
    }

    // 7. Video Stream Switcher
    function selectStreamQuality(url, buttonElement) {
        // Save current timestamp to resume playback seamlessly
        const currentTimestamp = mainVideoPlayer.currentTime;
        const wasPlaying = !mainVideoPlayer.paused;

        // Remove active highlights
        qualitySelectors.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
        buttonElement.classList.add('active');

        // Set new video stream source
        mainVideoPlayer.src = url;
        mainVideoPlayer.load();

        // Resume at same timeframe
        mainVideoPlayer.currentTime = currentTimestamp;
        if (wasPlaying) {
            mainVideoPlayer.play().catch(e => console.log('Autoplay blocked after quality switch:', e));
        }
    }

    // 8. Stream Playback & Error Triggers
    function playVideoStream(url) {
        playerErrorPanel.style.display = 'none';
        mainVideoPlayer.src = url;
        mainVideoPlayer.load();

        // Attempt play
        const playPromise = mainVideoPlayer.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Autoplay block by browser policies is normal, we suppress it
                console.log('Initial video play request deferred for user interaction:', error);
            });
        }
    }

    // Setup Video Error Handling (Handles bad URLs, CORS blocked domains, offline streams)
    mainVideoPlayer.addEventListener('error', (e) => {
        const errorState = mainVideoPlayer.error;
        console.warn('Video element reported a loading error:', errorState);

        let customMessage = 'This video file could not be loaded because the host server is offline or is blocking cross-origin streaming.';

        if (errorState) {
            switch (errorState.code) {
                case errorState.MEDIA_ERR_ABORTED:
                    customMessage = 'The video stream load was aborted.';
                    break;
                case errorState.MEDIA_ERR_NETWORK:
                    customMessage = 'A network error occurred while downloading the stream file.';
                    break;
                case errorState.MEDIA_ERR_DECODE:
                    customMessage = 'The media file format is corrupted or unsupported by your browser.';
                    break;
                case errorState.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    customMessage = 'This video file or link is no longer available on the server.';
                    break;
            }
        }

        playerErrorText.textContent = `${customMessage} (URL: ${mainVideoPlayer.src})`;
        playerErrorPanel.style.display = 'flex';
    });

    // Wire retry stream trigger
    retryStreamBtn.onclick = () => {
        playerErrorPanel.style.display = 'none';
        mainVideoPlayer.load();
        mainVideoPlayer.play().catch(e => console.log('Manual play retry failed:', e));
    };

    // 9. Close Modal Handlers
    function closeMovieModal() {
        mainVideoPlayer.pause();
        mainVideoPlayer.src = '';
        mainVideoPlayer.load();

        movieModal.classList.remove('open');
        document.body.style.overflow = ''; // restore scroll
    }

    modalCloseBtn.addEventListener('click', closeMovieModal);
    modalBackdrop.addEventListener('click', closeMovieModal);

    // Support Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && movieModal.classList.contains('open')) {
            closeMovieModal();
        }
    });

    // 10. Search and Sorting Input Listeners
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        filterAndRenderMovies();
    });

    sortBySelect.addEventListener('change', (e) => {
        sortBy = e.target.value;
        filterAndRenderMovies();
    });

    // Start App
    loadDatabase();
});
