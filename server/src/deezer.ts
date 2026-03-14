import axios from 'axios';
import type { Song } from './types.js';

const DEEZER_API = 'https://api.deezer.com';

// Mapeo de géneros a artistas clave 100% confiables para búsqueda pura
const GENRE_ARTISTS: { [key: string]: string[] } = {
    'reggae': [
        'Bob Marley', 'Peter Tosh', 'Burning Spear', 'Jimmy Cliff', 'Steel Pulse', 
        'Black Uhuru', 'Bunny Wailer', 'Gregory Isaacs', 'Dennis Brown', 'Toots and the Maytals',
        'Alpha Blondy', 'Lucky Dube', 'Yellowman', 'Sizzla', 'Buju Banton', 
        'The Abyssinians', 'Culture', 'Israel Vibration', 'Max Romeo', 'The Gladiators',
        'Inner Circle', 'Jacob Miller', 'Barrington Levy', 'Eek-A-Mouse', 'Althea & Donna', 
        'Capleton', 'Damian Marley', 'Ziggy Marley', 'Protoje', 'Chronixx',
        'Shaggy', 'Sean Paul', 'UB40', 'Musical Youth', 'Eddy Grant', 
        'Collie Buddz', 'Matisyahu', 'Beres Hammond', 'Garnett Silk', 'Third World'
    ],
    'reggaeton': [
        'Daddy Yankee', 'Don Omar', 'Bad Bunny', 'J Balvin', 'Wisin y Yandel', 
        'Arcángel', 'Farruko', 'Anitta', 'Jhay Cortez', 'Ozuna',
        'Tego Calderón', 'Ivy Queen', 'Zion & Lennox', 'Nicky Jam', 'Plan B', 
        'Vico C', 'Alexis & Fido', 'Rauw Alejandro', 'Karol G', 'Maluma', 
        'Myke Towers', 'Feid', 'De La Ghetto', 'Chencho Corleone', 'Yandel', 
        'Tito El Bambino', 'Ñengo Flow', 'Ryan Castro', 'Blessd', 'El Alfa',
        'Luny Tunes', 'Natti Natasha', 'Becky G', 'Sech', 'Mora', 
        'Manuel Turizo', 'Bryant Myers', 'Cosculluela', 'Baby Rasta & Gringo', 'Calle 13', 'Quevedo'
    ],
    'punk': [
        'The Ramones', 'Sex Pistols', 'The Clash', 'Dead Kennedys', 'Black Flag', 
        'Minor Threat', 'The Damned', 'Buzzcocks', 'Joy Division', 'Descendents',
        'Bad Brains', 'Fugazi', 'Social Distortion', 'The Adicts', 'Crass', 
        'Circle Jerks', 'Stiff Little Fingers', 'Sham 69', 'The Stooges', 'Misfits', 
        'Pennywise', 'NOFX', 'Bad Religion', 'Rancid', 'The Exploited', 
        'Discharge', 'GBH', 'Anti-Flag', 'Rise Against', 'Television',
        'Green Day', 'The Offspring', 'Blink-182', 'Sum 41', 'Flogging Molly', 
        'Dropkick Murphys', 'Patti Smith', 'X', 'The Germs', 'Subhumans'
    ],
    'hip-hop': [
        'Tupac', 'The Notorious B.I.G', 'Nas', 'Jay-Z', 'Eminem', 
        'Dr. Dre', 'Rakim', 'KRS-One', 'Run-D.M.C', 'LL Cool J',
        'Snoop Dogg', 'Kendrick Lamar', 'Kanye West', 'Wu-Tang Clan', 'Public Enemy', 
        'A Tribe Called Quest', 'Outkast', 'Ice Cube', '50 Cent', 'J. Cole', 
        'Andre 3000', 'Big Daddy Kane', 'Slick Rick', 'Mos Def', 'Common', 
        'Method Man', 'Ghostface Killah', 'Lauryn Hill', 'Busta Rhymes', 'DMX',
        'Drake', 'Travis Scott', 'Tyler the Creator', 'Lil Wayne', 'Future', 
        'Cardi B', 'Nicki Minaj', 'Mac Miller', 'Post Malone', 'A$AP Rocky'
    ],
    'hip hop': ['Tupac', 'The Notorious B.I.G', 'Nas', 'Jay-Z', 'Eminem', 'Dr. Dre', 'Rakim', 'KRS-One', 'Run-D.M.C', 'LL Cool J', 'Snoop Dogg', 'Kendrick Lamar', 'Kanye West', 'Wu-Tang Clan', 'Public Enemy', 'A Tribe Called Quest', 'Outkast', 'Ice Cube', '50 Cent', 'J. Cole', 'Andre 3000', 'Big Daddy Kane', 'Slick Rick', 'Mos Def', 'Common', 'Method Man', 'Ghostface Killah', 'Lauryn Hill', 'Busta Rhymes', 'DMX', 'Drake', 'Travis Scott', 'Tyler the Creator', 'Lil Wayne', 'Future', 'Cardi B', 'Nicki Minaj', 'Mac Miller', 'Post Malone', 'A$AP Rocky'],
    'rap': ['Tupac', 'The Notorious B.I.G', 'Nas', 'Jay-Z', 'Eminem', 'Dr. Dre', 'Rakim', 'KRS-One', 'Run-D.M.C', 'LL Cool J', 'Snoop Dogg', 'Kendrick Lamar', 'Kanye West', 'Wu-Tang Clan', 'Public Enemy', 'A Tribe Called Quest', 'Outkast', 'Ice Cube', '50 Cent', 'J. Cole', 'Andre 3000', 'Big Daddy Kane', 'Slick Rick', 'Mos Def', 'Common', 'Method Man', 'Ghostface Killah', 'Lauryn Hill', 'Busta Rhymes', 'DMX', 'Drake', 'Travis Scott', 'Tyler the Creator', 'Lil Wayne', 'Future', 'Cardi B', 'Nicki Minaj', 'Mac Miller', 'Post Malone', 'A$AP Rocky'],
    'rock': [
        'The Beatles', 'The Rolling Stones', 'Led Zeppelin', 'Pink Floyd', 'David Bowie', 
        'The Who', 'AC/DC', 'Metallica', 'Aerosmith', 'Guns N\' Roses',
        'Queen', 'Jimi Hendrix', 'Deep Purple', 'The Doors', 'U2', 
        'Bruce Springsteen', 'Fleetwood Mac', 'The Police', 'Dire Straits', 'Black Sabbath', 
        'Iron Maiden', 'Pearl Jam', 'Radiohead', 'Linkin Park', 'Bon Jovi', 
        'Van Halen', 'Red Hot Chili Peppers', 'Journey', 'The Kinks', 'Genesis',
        'Elton John', 'Nirvana', 'George Michael', 'Muse', 'Foo Fighters', 
        'Green Day', 'Coldplay', 'Oasis', 'Blur', 'The Beach Boys', 'Motley Crue'
    ],
    'pop': [
        'Michael Jackson', 'Madonna', 'Britney Spears', 'The Weeknd', 'Ariana Grande', 
        'Taylor Swift', 'Lady Gaga', 'Beyoncé', 'Drake', 'Billie Eilish', 
        'Olivia Rodrigo', 'Sabrina Carpenter', 'Chappell Roan', 'Gracie Abrams', 'Justin Bieber', 
        'Katy Perry', 'Adele', 'Rihanna', 'Bruno Mars', 'Ed Sheeran', 
        'Harry Styles', 'Dua Lipa', 'Prince', 'George Michael', 'Whitney Houston', 
        'Celine Dion', 'Elton John', 'ABBA', 'Cher', 'Justin Timberlake',
        'Coldplay', 'Sam Smith', 'Miley Cyrus', 'Doja Cat', 'Lana Del Rey', 
        'Sia', 'Demi Lovato', 'Selena Gomez', 'Shawn Mendes', 'Camila Cabello'
    ],
    'jazz': [
        'Miles Davis', 'John Coltrane', 'Ella Fitzgerald', 'Duke Ellington', 'Charlie Parker', 
        'Billie Holiday', 'Thelonious Monk', 'Louis Armstrong', 'Oscar Peterson', 'Herbie Hancock',
        'Charles Mingus', 'Dave Brubeck', 'Count Basie', 'Dizzy Gillespie', 'Sarah Vaughan', 
        'Wes Montgomery', 'Stan Getz', 'Chet Baker', 'Bill Evans', 'Art Blakey', 
        'Nina Simone', 'Nat King Cole', 'Django Reinhardt', 'Chick Corea', 'Wayne Shorter', 
        'Benny Goodman', 'Sun Ra', 'Dexter Gordon', 'Ornette Coleman', 'Bud Powell',
        'Norah Jones', 'Diana Krall', 'Kamasi Washington', 'Esperanza Spalding', 'Gregory Porter', 
        'Wynton Marsalis', 'Stacey Kent', 'Jamie Cullum', 'Pat Metheny', 'Quincy Jones'
    ],
    'blues': [
        'B.B. King', 'Muddy Waters', 'Howlin\' Wolf', 'Bessie Smith', 'Robert Johnson', 
        'John Lee Hooker', 'Albert King', 'Etta James', 'Buddy Guy', 'Willie Dixon',
        'Stevie Ray Vaughan', 'T-Bone Walker', 'Elmore James', 'Son House', 'Blind Willie McTell', 
        'Ma Rainey', 'Lightnin\' Hopkins', 'Freddie King', 'Junior Wells', 'Lead Belly', 
        'Otis Rush', 'Big Maceo Merriweather', 'Gary Clark Jr.', 'Joe Bonamassa', 'Taj Mahal', 
        'Koko Taylor', 'Bobby "Blue" Bland', 'Memphis Slim', 'Skip James', 'Pinetop Perkins',
        'Rory Gallagher', 'Johnny Winter', 'Bonnie Raitt', 'Derek Trucks', 'Susan Tedeschi', 
        'Keb\' Mo\'', 'Big Mama Thornton', 'Mississippi John Hurt', 'Charley Patton', 'Lightnin\' Slim'
    ],
    'k-pop': [
        'BTS', 'BLACKPINK', 'EXO', 'Stray Kids', 'TWICE', 'Red Velvet', 'iKON', 'Seventeen', 
        'Girl\'s Generation', 'Super Junior', 'BIGBANG', 'SHINee', 'NewJeans', 'IVE', 'LE SSERAFIM', 
        'TXT', 'ATEEZ', 'NCT 127', 'ENHYPEN', 'ITZY', 'Aespa', 'MAMAMOO', 'Monsta X', 
        '2NE1', 'TVXQ!', 'Wonder Girls', 'GOT7', 'PSY', 'IU', 'Rain',
        'G-Dragon', 'Taemin', 'Sunmi', 'Chungha', 'Zico', 
        'Day6', 'The Boyz', 'NMIXX', 'BABYMONSTER', 'FIFTY FIFTY'
    ],
    'r&b': [
        'Usher', 'R. Kelly', 'Boyz II Men', 'TLC', 'Aaliyah', 'Outkast', 'Ne-Yo', 
        'Mary J. Blige', 'Erykah Badu', 'Bryson Tiller', 'Marvin Gaye', 'Stevie Wonder', 
        'Aretha Franklin', 'Ray Charles', 'Whitney Houston', 'Luther Vandross', 'Alicia Keys', 
        'SZA', 'Frank Ocean', 'The Weeknd', 'D\'Angelo', 'Maxwell', 'Toni Braxton', 
        'Ginuwine', 'Monica', 'Brandy', 'Chris Brown', 'Summer Walker', 'H.E.R.', 'Jali',
        'Solange', 'Janelle Monáe', 'Miguel', 'Kehlani', 'Giveon', 
        'Brent Faiyaz', 'Lucky Daye', 'Victoria Monét', 'Tems', 'Teyana Taylor'
    ],
    'electronic': [
        'Daft Punk', 'The Chemical Brothers', 'Aphex Twin', 'Fatboy Slim', 'Moby', 
        'Deadmau5', 'Skrillex', 'David Guetta', 'Avicii', 'Tiësto', 'Kraftwerk', 
        'Brian Eno', 'Jean-Michel Jarre', 'The Prodigy', 'LCD Soundsystem', 'Justice', 
        'Disclosure', 'Flying Lotus', 'Burial', 'Four Tet', 'Bonobo', 'Massive Attack', 
        'Portishead', 'Boards of Canada', 'Orbital', 'Underworld', 'Vangelis', 'Flume', 
        'Zedd', 'Kygo', 'Jamie xx', 'Kaytranada', 'Nicolas Jaar', 'Jon Hopkins', 'Moderat', 
        'Mount Kimbie', 'Amon Tobin', 'Squarepusher', 'Autechre', 'Richie Hawtin'
    ],
    'dance': [
        'Daft Punk', 'Fatboy Slim', 'David Guetta', 'Calvin Harris', 'Diplo', 
        'Avicii', 'Tiësto', 'Deadmau5', 'The Chemical Brothers', 'Hardwell',
        'Armin van Buuren', 'Swedish House Mafia', 'Marshmello', 'Martin Garrix', 'Zedd', 
        'Kygo', 'Robin Schulz', 'Major Lazer', 'Clean Bandit', 'The Chainsmokers', 
        'Cascada', 'Alice Deejay', 'Vengaboys', 'Bob Sinclar', 'Eric Prydz', 
        'Paul van Dyk', 'Benny Benassi', 'Rüfüs Du Sol', 'Fred again..', 'Fisher',
        'Peggy Gou', 'Honey Dijon', 'Dom Dolla', 'Purple Disco Machine', 'CamelPhat', 
        'Duke Dumont', 'Gorgon City', 'Jax Jones', 'Oliver Heldens', 'Meduza'
    ],
    'edm': [
        'Daft Punk', 'David Guetta', 'Avicii', 'Tiësto', 'Deadmau5', 
        'Hardwell', 'Diplo', 'Zedd', 'Calvin Harris', 'Martin Garrix',
        'Steve Aoki', 'Skrillex', 'Marshmello', 'The Chainsmokers', 'DJ Snake', 
        'Alan Walker', 'Afrojack', 'Alesso', 'Kaskade', 'Above & Beyond', 
        'Seven Lions', 'Illenium', 'REZZ', 'Alison Wonderland', 'Flume', 
        'Dillon Francis', 'Porter Robinson', 'Madeon', 'Gryffin', 'Don Diablo',
        'W&W', 'Nicky Romero', 'KSHMR', 'Vicetone', 'Yellow Claw', 
        'Galantis', 'Lost Frequencies', 'San Holo', 'Sub Focus', 'Pendulum'
    ],
    'indie': [
        'The Strokes', 'Djo', 'Arctic Monkeys', 'Arcade Fire', 'The National', 
        'Interpol', 'Vampire Weekend', 'Foster the People', 'Cold War Kids', 'Phoenix', 
        'Two Door Cinema Club', 'Tame Impala', 'Modest Mouse', 'The Libertines', 'Florence + The Machine', 
        'The Killers', 'MGMT', 'Bon Iver', 'Mac DeMarco', 'The 1975', 
        'alt-J', 'Beach House', 'Glass Animals', 'Phoebe Bridgers', 'Mitski', 
        'Neutral Milk Hotel', 'Pixies', 'The Smiths', 'Wilco', 'Spoon',
        'Cigarettes After Sex', 'Wallows', 'Clairo', 'TV Girl', 'The Garden', 
        'Beabadoobee', 'Big Thief', 'Father John Misty', 'Deerhunter', 'Grizzly Bear'
    ],
    'alternative': [
        'Nirvana', 'Pearl Jam', 'Soundgarden', 'The Smashing Pumpkins', 'Stone Temple Pilots', 
        'Alice in Chains', 'Faith No More', 'Rage Against the Machine', 'Pixies', 'Sonic Youth',
        'Radiohead', 'Beck', 'Red Hot Chili Peppers', 'Jane\'s Addiction', 'The Cure', 
        'R.E.M.', 'Blur', 'Oasis', 'Gorillaz', 'Linkin Park', 'Depeche Mode', 
        'Nine Inch Nails', 'The White Stripes', 'Green Day', 'Foo Fighters', 
        'Weezer', 'Muse', 'Björk', 'PJ Harvey', 'Violent Femmes',
        'The Killers', 'Coldplay', 'Arctic Monkeys', 'The Strokes', 'Imagine Dragons', 
        'Twenty One Pilots', 'Paramore', 'My Chemical Romance', 'No Doubt', 'Panic! At The Disco'
    ],
    'country': [
        'Johnny Cash', 'Willie Nelson', 'Dolly Parton', 'Hank Williams', 'George Strait', 
        'Waylon Jennings', 'Merle Haggard', 'Patsy Cline', 'Buck Owens', 'Loretta Lynn',
        'Garth Brooks', 'Kenny Rogers', 'Alan Jackson', 'Reba McEntire', 'Tim McGraw', 
        'Shania Twain', 'Carrie Underwood', 'Luke Combs', 'Chris Stapleton', 'Morgan Wallen', 
        'Glen Campbell', 'Charley Pride', 'Tammy Wynette', 'Conway Twitty', 'George Jones', 
        'Brooks & Dunn', 'Miranda Lambert', 'Blake Shelton', 'Zac Brown Band', 'Taylor Swift (Early)',
        'Kacey Musgraves', 'Tyler Childers', 'Sturgill Simpson', 'Colter Wall', 'Maren Morris', 
        'Keith Urban', 'Brad Paisley', 'Jason Aldean', 'Eric Church', 'Kane Brown'
    ],
    'classical': [
        'Ludwig van Beethoven', 'Wolfgang Amadeus Mozart', 'Johan Sebastian Bach', 
        'Pyotr Ilyich Tchaikovsky', 'George Friedrich Handel', 'Antonio Vivaldi', 
        'Gioachino Rossini', 'Giuseppe Verdi', 'Richard Wagner', 'Claude Debussy',
        'Johannes Brahms', 'Franz Schubert', 'Frédéric Chopin', 'Igor Stravinsky', 
        'Gustav Mahler', 'Maurice Ravel', 'Sergei Rachmaninoff', 'Giacomo Puccini', 
        'Dmitri Shostakovich', 'Felix Mendelssohn', 'Antonín Dvořák', 'Edward Elgar', 
        'Erik Satie', 'Béla Bartók', 'Jean Sibelius', 'Modest Mussorgsky', 
        'Camille Saint-Saëns', 'Franz Liszt', 'Aaron Copland', 'Leonard Bernstein',
        'Philip Glass', 'Arvo Pärt', 'John Adams', 'Steve Reich', 'Max Richter', 
        'Ludovico Einaudi', 'Hans Zimmer', 'Gustav Holst', 'Claudio Monteverdi', 'Henry Purcell'
    ],
    'metal': [
        'Black Sabbath', 'Iron Maiden', 'Judas Priest', 'Slayer', 'Pantera', 
        'Lamb of God', 'Gojira', 'Opeth', 'Meshuggah', 'Korn',
        'Metallica', 'Megadeth', 'Anthrax', 'Motorhead', 'Slipknot', 
        'System of a Down', 'Tool', 'Avenged Sevenfold', 'Mastodon', 'Sepultura', 
        'Death', 'Cannibal Corpse', 'Nightwish', 'Helloween', 'Dream Theater', 
        'Dio', 'Ozzy Osbourne', 'Rammstein', 'In Flames', 'Machine Head',
        'Ghost', 'Architects', 'Bring Me The Horizon', 'Sleep Token', 'Jinjer', 
        'Behemoth', 'Deftones', 'Alice in Chains', 'Disturbed', 'Five Finger Death Punch'
    ],
    'folk': [
        'Bob Dylan', 'Joan Baez', 'Joni Mitchell', 'Leonard Cohen', 'Paul Simon', 
        'Woody Guthrie', 'Peter, Paul and Mary', 'The Lumineers', 'Mumford & Sons', 'Fleet Foxes',
        'Cat Stevens', 'Simon & Garfunkel', 'Nick Drake', 'Tracy Chapman', 'John Denver', 
        'Donovan', 'Gordon Lightfoot', 'Phil Ochs', 'The Byrds', 'Iron & Wine', 
        'Sufjan Stevens', 'Laura Marling', 'The Weavers', 'Fairport Convention', 'Judy Collins', 
        'Arlo Guthrie', 'The Dubliners', 'The Chieftains', 'Townes Van Zandt', 'Bon Iver',
        'Hozier', 'Gregory Alan Isakov', 'The Tallest Man on Earth', 'First Aid Kit', 'Vashti Bunyan', 
        'Bert Jansch', 'Jackson C. Frank', 'Tim Buckley', 'Dave Van Ronk', 'Jim Croce'
    ],
    'soul': [
        'Aretha Franklin', 'Sam Cooke', 'Marvin Gaye', 'Otis Redding', 'Ray Charles', 
        'Nina Simone', 'Wilson Pickett', 'Solomon Burke', 'Mavis Staples', 'Alicia Keys',
        'James Brown', 'Bill Withers', 'Al Green', 'Curtis Mayfield', 
        'Etta James', 'Dusty Springfield', 'Isaac Hayes', 'The Temptations', 'The Supremes', 
        'Jackie Wilson', 'Donny Hathaway', 'Roberta Flack', 'Ben E. King', 'Bobby Womack', 
        'Chaka Khan', 'Amy Winehouse', 'Erykah Badu', 'Joss Stone', 'Leon Bridges',
        'Stevie Wonder', 'Michael Jackson', 'George Michael', 'Adele', 'Solange', 
        'Jazmine Sullivan', 'Raphael Saadiq', 'D\'Angelo', 'Maxwell', 'Charles Bradley'
    ],
    'disco': [
        'Bee Gees', 'Donna Summer', 'KC and the Sunshine Band', 'Gloria Gaynor', 'Barry White', 
        'Earth, Wind & Fire', 'Sister Sledge', 'The Trammps', 'Village People', 'Chic',
        'ABBA', 'The Jacksons', 'Diana Ross', 'Boney M.', 'Amii Stewart', 
        'The Pointer Sisters', 'Sylvester', 'Anita Ward', 'Lipps Inc.', 'The Weather Girls', 
        'Cheryl Lynn', 'Grace Jones', 'Loleatta Holloway', 'Kool & The Gang', 'Heatwave', 
        'The Emotions', 'Indeep', 'Irene Cara', 'Patrick Hernandez', 'The Gap Band',
        'Silver Convention', 'Odyssey', 'Rose Royce', 'The Hues Corporation', 'Van McCoy', 
        'Candi Staton', 'The Ritchie Family', 'Santa Esmeralda', 'Tavares', 'Giorgio Moroder'
    ],
    'funk': [
        'James Brown', 'Parliament-Funkadelic', 'Earth, Wind & Fire', 'Stevie Wonder', 'Prince', 
        'Zapp & Roger', 'Roger Troutman', 'Herbie Hancock', 'Grandmaster Flash', 'The Time',
        'Kool & The Gang', 'The Meters', 'Sly & The Family Stone', 'Rick James', 'The Isley Brothers', 
        'George Clinton', 'Bootsy Collins', 'Betty Davis', 'Ohio Players', 'Wild Cherry', 
        'Commodores', 'The Brothers Johnson', 'Average White Band', 'Cameo', 'Tower of Power', 
        'Rufus', 'Chaka Khan', 'Slave', 'Fatback Band', 'Bar-Kays',
        'Vulfpeck', 'Khruangbin', 'The Fearless Flyers', 'Cory Wong', 'Lettuce', 
        'Dumpstaphunk', 'The Budos Band', 'Sharon Jones & The Dap-Kings', 'Galactic', 'Orgone'
    ],
    'salsa': [
        'Celia Cruz', 'Willie Colón', 'Héctor Lavoe', 'Oscar D\'León', 'Rubén Blades', 
        'Ismael Miranda', 'Ray Barretto', 'Tito Puente', 'Eddie Santiago', 'Joe Arroyo',
        'El Gran Combo de Puerto Rico', 'La Sonora Ponceña', 'Richie Ray & Bobby Cruz', 
        'Cheo Feliciano', 'Gilberto Santa Rosa', 'Marc Anthony', 'Victor Manuelle', 
        'La India', 'Fania All-Stars', 'Roberto Roena', 'Luis Enrique', 'Frankie Ruiz', 
        'Jerry Rivera', 'Grupo Niche', 'Orquesta Guayacán', 'Papo Lucca', 'Adalberto Santiago', 
        'Andy Montañez', 'Tito Nieves', 'Maelo Ruiz',
        'Ismael Rivera', 'Benny Moré', 'Sonora Matancera', 'Fruko y sus Tesos', 'Bobby Valentín', 
        'Tommy Olivencia', 'Tony Vega', 'Rey Ruiz', 'Hansel y Raul', 'Choco Orta'
    ],
    'vallenato': [
        'Carlos Vives', 'Diomedes Díaz', 'Binomio de Oro de América', 'Jorge Celedón', 'Felipe Peláez', 
        'Peter Manjarrés', 'Rafael Orozco', 'Silvestre Dangond', 'Los Diablitos', 'Los Chiches del Vallenato',
        'Los Gigantes del Vallenato', 'Los Inquietos del Vallenato', 'Nelson Velásquez', 'Jean Carlos Centeno', 
        'Alfredo Gutiérrez', 'Alejo Durán', 'Luis Enrique Martínez', 'Pacho Rada', 'Emiliano Zuleta', 
        'Poncho Zuleta', 'Iván Villazón', 'Beto Zabaleta', 'Silvio Brito', 'Yeison Jiménez', 
        'Miguel Morales', 'Patricia Teherán', 'Kaleth Morales', 'Hebert Vargas', 'Alex Manga', 'Daniel Calderón',
        'Omar Geles', 'Elder Dayán Díaz', 'Mono Zabaleta', 'Kvrass', 'Luifer Cuello', 
        'Adriana Lucía', 'Gusi', 'Lucas Dangond', 'Los Embajadores', 'Luis Mario Oñate'
    ],
    'bachata': [
        'Juan Luis Guerra', 'Aventura', 'Romeo Santos', 'Antony Santos', 'Xtreme', 
        'Monchy & Alexandra', 'Grupo Manía', 'Hector Acosta', 'Los Ilegales', 'Prince Royce',
        'Raulin Rodriguez', 'Luis Vargas', 'Frank Reyes', 'Zacarias Ferreira', 'El Chaval de la Bachata', 
        'Joe Veras', 'Teodoro Reyes', 'Leonardo Paniagua', 'Blas Duran', 'Yoskar Sarante', 
        'Kiko Rodriguez', 'Elvis Martinez', 'Daniel Santacruz', 'Vicente García', 'Leslie Grace', 
        'Toby Love', 'Luis Miguel del Amargue', 'Henry Santos', 'Alexandra', 'Joan Soriano',
        'El Vinny', 'Karlos Rosé', 'Pinto Picasso', 'Luis Segura', 'Jose Manuel Calderon', 
        'Eladio Romero Santos', 'Chicho Severino', 'Andy Andy', 'Cosby', 'Bachata Heightz'
    ],
    'cumbia': [
        'Los Graduados', 'Sonora Dinamita', 'Guaco', 'Grupo Bahía', 'La Hipoteca', 
        'Fulanito', 'Grupo Galé', 'El Binomio de Oro', 'Los Palmeras', 'Gilda', 
        'Los Ángeles Azules', 'Margarita la Diosa de la Cumbia', 'Pastor López', 'Rodolfo Aicardi', 
        'Los Hispanos', 'La Sonora de Margarita', 'Grupo Cañaveral', 'Rafaga', 'Amar Azul', 
        'Damas Gratis', 'Los Mirlos', 'Juaneco y su Combo', 'Aniceto Molina', 'Lucho Bermúdez', 
        'Pacho Galán', 'Totó la Momposina', 'Ondatrópica', 'Bomba Estéreo', 'Chicha Libre', 'Bareto',
        'Los Destellos', 'La Delio Valdez', 'Santaferia', 'Chico Trujillo', 'La Combo Tortuga', 
        'Los Shapis', 'Grupo Karicia', 'Agua Marina', 'Armonia 10', 'Corazón Serrano'
    ],
    'merengue': [
        'Juan Luis Guerra', 'Oro Sólido', 'Sergio Vargas', 'Los Ilegales', 'Grupo Manía', 
        'Eddy Herrera', 'Fulanito', 'Kinito Méndez', 'Wilfrido Vargas', 'Johnny Ventura', 
        'Olga Tañón', 'Elvis Crespo', 'Milly Quezada', 'Fernando Villalona', 'Los Vecinos', 
        'The New York Band', 'Bandy2', 'La Makina', 'Rikarena', 'Jossie Esteban', 
        'Pochy y su Cocoband', 'Cuco Valoy', 'Bonny Cepeda', 'Alex Bueno', 'Miriam Cruz', 
        'Manny Manuel', 'Gabriel Pagán', 'Omega', 'Chichi Peralta', 'Toño Rosario',
        'Papi Sánchez', 'Magic Juan', 'Proyecto Uno', 'Sandy & Papo', 'Ilegales', 
        'Julian Oro Duro', 'Tito Kenton', 'El Prodigio', 'Krisspy', 'Banda Real'
    ],
    'tango': [
        'Carlos Gardel', 'Astor Piazzolla', 'Julio Sosa', 'Roberto Goyeneche', 'Carlos Di Sarli', 
        'Juan d\'Arienzo', 'Osvaldo Pugliese', 'Leopoldo Federico', 'Adriana Varela', 'Aníbal Troilo', 
        'Francisco Canaro', 'Edmundo Rivero', 'Libertad Lamarque', 'Tita Merello', 'Enrique Santos Discépolo', 
        'Homero Manzi', 'Mariano Mores', 'Nelly Omar', 'Alberto Castillo', 'Osvaldo Fresedo', 
        'Miguel Caló', 'Angel D\'Agostino', 'Lucio Demare', 'Rodolfo Biagi', 'Hugo del Carril', 
        'Susana Rinaldi', 'Rubén Juárez', 'Gino Matteo', 'Gotan Project', 'Bajofondo',
        'Osvaldo Piro', 'Horacio Salgán', 'Nelly Vazquez', 'Virginia Luque', 'Jorge Falcon', 
        'Guillermo Fernandez', 'Ariel Ardit', 'Lidia Borda', 'Quinteto Real', 'Sexteto Mayor'
    ],
    'grunge': [
        'Nirvana', 'Pearl Jam', 'Soundgarden', 'Alice in Chains', 'Stone Temple Pilots', 
        'Mudhoney', 'Screaming Trees', 'Melvins', 'Tad', 'Green River', 
        'Temple of the Dog', 'Mother Love Bone', 'Silverchair', 'L7', 'Hole', 
        'Bush', 'Local H', 'The Gits', 'Babes in Toyland', 'Paw', 
        'Skin Yard', 'U-Men', 'Malfunkshun', '7 Year Bitch', 'Hammerbox', 
        'Veruca Salt', 'Candlebox', 'Days of the New', 'Love Battery', 'Gruntruck',
        'Smile', 'Blood Circus', 'Coffin Break', 'Willard', 'The Thrown Ups', 
        'Bundle of Hiss', 'Dickless', 'Mono Men', 'Seaweed', 'Superfuzz'
    ],
    'ska': [
        'The Specials', 'Madness', 'The Selecter', 'Bad Manners', 'Sublime', 
        'Reel Big Fish', 'Less Than Jake', 'The Clash', 'The Police', 'No Doubt', 
        'The Skatalites', 'Prince Buster', 'Desmond Dekker', 'The Toasters', 'The Slackers', 
        'Save Ferris', 'Goldfinger', 'Operation Ivy', 'The Mighty Mighty Bosstones', 'Fishbone', 
        'The Interrupters', 'Streetlight Manifesto', 'Tokyo Ska Paradise Orchestra', 'Panteón Rococó', 
        'Los Fabulosos Cadillacs', 'Los Auténticos Decadentes', 'La Maldita Vecindad', 'Inspector', 
        'Skank', 'Hepcat',
        'The Pietasters', 'Big D and the Kids Table', 'Ska-P', 'Desorden Público', 'Los Pericos', 
        'The Aggrolites', 'Busters', 'Mephiskapheles', 'Bad Brains', 'English Beat'
    ],
    'gospel': [
        'Mahalia Jackson', 'Elvis Presley', 'Yolanda Adams', 'Kirk Franklin', 'Shirley Caesar', 
        'Al Green', 'Sam Cooke', 'Aretha Franklin', 'Tye Tribbett', 'CeCe Winans', 
        'BeBe Winans', 'Fred Hammond', 'Marvin Sapp', 'Donnie McClurkin', 'Tamela Mann', 
        'Andraé Crouch', 'The Clark Sisters', 'Hezekiah Walker', 'Israel Houghton', 'Smokie Norful', 
        'Maverick City Music', 'Tasha Cobbs Leonard', 'Lecrae', 'The Blind Boys of Alabama', 
        'The Soul Stirrers', 'The Jordanaires', 'Thomas A. Dorsey', 'Sandi Patty', 'Amy Grant', 'Casting Crowns',
        'Kim Burrell', 'Donnie McClurkin', 'Byron Cage', 'John P. Kee', 'Deitrick Haddon', 
        'Jonathan McReynolds', 'Travis Greene', 'Dante Bowe', 'Kierra Sheard', 'Mary Mary'
    ],
    'bluegrass': [
        'Bill Monroe', 'Earl Scruggs', 'Lester Flatt', 'The Stanley Brothers', 'The Osborne Brothers', 
        'Ricky Skaggs', 'Tony Rice', 'Norman Blake', 'David Grisman', 'Doc Watson', 
        'Alison Krauss', 'Béla Fleck', 'Del McCoury', 'John Hartford', 'Old & In The Way', 
        'The Dillards', 'Chris Thile', 'The Steeldrivers', 'Billy Strings', 'Molly Tuttle', 
        'Rhiannon Giddens', 'The Punch Brothers', 'Trampled by Turtles', 'Nickel Creek', 
        'Seldom Scene', 'J.D. Crowe', 'Sam Bush', 'Jerry Douglas', 'Vassar Clements', 'Clarence White',
        'Kentucky Colonels', 'Peter Rowan', 'Tim O\'Brien', 'Sierra Hull', 'Bryan Sutton', 
        'Noam Pikelny', 'Stuart Duncan', 'Balsam Range', 'The Lonesome River Band', 'Dailey & Vincent'
    ],
    'house': [
        'Daft Punk', 'Disclosure', 'Eric Prydz', 'Frankie Knuckles', 'Marshall Jefferson', 
        'Carl Cox', 'Masters at Work', 'Kerri Chandler', 'Larry Heard', 'Kevin Saunderson', 
        'Derrick May', 'Juan Atkins', 'Todd Terry', 'Honey Dijon', 'Black Coffee', 
        'Solomun', 'The Blessed Madonna', 'Jamie Jones', 'Peggy Gou', 'Kaytranada', 
        'Moodymann', 'Theo Parrish', 'Armand Van Helden', 'Green Velvet', 'Roger Sanchez', 
        'David Morales', 'Pete Tong', 'Bob Sinclar', 'Claptone', 'Fisher',
        'MK', 'Defected', 'CamelPhat', 'Tchami', 'Malaa', 
        'Vintage Culture', 'John Summit', 'Purple Disco Machine', 'Hot Since 82', 'The Martinez Brothers'
    ],
    'techno': [
        'Richie Hawtin', 'Adam Beyer', 'Amelie Lens', 'Charlotte de Witte', 'Carl Cox', 
        'Loco Dice', 'Jeff Mills', 'Robert Hood', 'Surgeon', 'Dave Clarke', 
        'Juan Atkins', 'Kevin Saunderson', 'Derrick May', 'Sven Väth', 'Laurent Garnier', 
        'Nina Kraviz', 'Ben Klock', 'Marcel Dettmann', 'Chris Liebing', 'Speedy J', 
        'Dubfire', 'Paul Kalkbrenner', 'Ellen Allien', 'Boris Brejcha', 'Enrico Sangiuliano', 
        'Nicole Moudaber', 'Joseph Capriati', 'Slam', 'Underground Resistance', 'The Belleville Three',
        'Oscar Mulero', '999999999', 'I Hate Models', 'Fjaak', 'Tale of Us', 
        'Maceo Plex', 'Dixon', 'Âme', 'Kobosil', 'Blawan'
    ],
    'soundtrack': [
        'Hans Zimmer', 'John Williams', 'Danny Elfman', 'Michael Giacchino', 'Alan Menken', 
        'Koji Kondo', 'Nobuo Uematsu', 'Yoko Shimomura', 'Austin Wintory', 'Clint Mansell',
        'Ennio Morricone', 'Vangelis', 'Howard Shore', 'James Horner', 'Jerry Goldsmith', 
        'Bernard Herrmann', 'Joe Hisaishi', 'Ludwig Göransson', 'Max Richter', 'Jóhann Jóhannsson', 
        'Ryuichi Sakamoto', 'Thomas Newman', 'Alexandre Desplat', 'Ramin Djawadi', 'Bear McCreary', 
        'John Barry', 'Gustavo Santaolalla', 'Nino Rota', 'Maurice Jarre', 'Basil Poledouris',
        'Philip Glass', 'Carter Burwell', 'Hildur Guðnadóttir', 'Nicholas Britell', 'Daniel Pemberton', 
        'Marco Beltrami', 'Mark Mancina', 'Trevor Rabin', 'Harry Gregson-Williams', 'Junkie XL'
    ],
};

// Mapeo de géneros a IDs de Deezer (solo como referencia, no se usa)

// Mapeo de géneros a términos de búsqueda (solo como fallback)
const GENRE_SEARCH_TERMS: { [key: string]: string[] } = {
  'reggae': ['reggae music', 'bob marley', 'wailers', 'reggae classic', 'roots reggae'],
  'reggaeton': ['reggaeton', 'perreo', 'dembow', 'reggaeton latino', 'reggaeton hits'],
  'salsa': ['salsa music', 'salsa cubana', 'salsa dance', 'salsa hits', 'orchestras salsa'],
  'vallenato': ['vallenato', 'carlos vives', 'juan luis guerra', 'cumbia vallenato', 'accordion'],
  'bachata': ['bachata', 'juan luis guerra', 'aventura', 'bachata dominicana', 'bachata hits'],
  'cumbia': ['cumbia music', 'cumbia colombiana', 'cumbia tradicional', 'cumbia hits', 'cumbia dance'],
  'merengue': ['merengue', 'juan luis guerra', 'merengue dominicano', 'merengue hits', 'merengue dance'],
  'tango': ['tango music', 'carlos gardel', 'tango argentino', 'tango hits', 'tango dancing'],
};

// Función helper para obtener términos de búsqueda para un género (fallback)
function getSearchTerms(genre: string): string[] {
  const genreKey = genre.toLowerCase();
  
  // Si existe un mapeo específico, usarlo
  if (GENRE_SEARCH_TERMS[genreKey]) {
    return GENRE_SEARCH_TERMS[genreKey];
  }
  
  // Si no, generar términos automáticos
  return [
    genre,
    `${genre} hits`,
    `${genre} music`,
    `best ${genre}`,
    `top ${genre}`
  ];
}

// Mapeo de años a IDs de playlist en Deezer
const yearPlaylistMap: Record<number, string> = {
  1960: '15049579303',
  1961: '15049606603',
  1962: '15049668783',
  1963: '15049679003',
  1964: '15049687403',
  1965: '15049696823',
  1966: '15049718563',
  1967: '15049759923',
  1968: '15049768383',
  1969: '15049775003',
  1970: '15049803363',
  1971: '15049809803',
  1972: '15049815683',
  1973: '15049841383',
  1974: '15049855563',
  1975: '15049869143',
  1976: '15049875503',
  1977: '15049880383',
  1978: '15049884343',
  1979: '15049891103',
  1980: '15049895483',
  1981: '15049903103',
  1982: '15049906043',
  1983: '15049911943',
  1984: '15049917983',
  1985: '15049920203',
  1986: '15049924143',
  1987: '15049927103',
  1988: '15049929763',
  1989: '15049934603',
  1990: '15049938383',
  1991: '15049941763',
  1992: '15049951783',
  1993: '15049961643',
  1994: '15049971043',
  1995: '15049979943',
  1996: '15049984763',
  1997: '15049993103',
  1998: '15050001563',
  1999: '15050005863',
  2000: '15050007963',
  2001: '15050016183',
  2002: '15050025763',
  2003: '15050033603',
  2004: '15050036983',
  2005: '15050045343',
  2006: '15050050903',
  2007: '15050057223',
  2008: '15050062083',
  2009: '15050067923',
  2010: '15050073343',
  2011: '15050080963',
  2012: '15050086563',
  2013: '15050095883',
  2014: '15050104103',
  2015: '15050110623',
  2016: '15050120903',
  2017: '15051230463',
  2018: '15051243643',
  2019: '15051259283',
  2020: '15051272523',
  2021: '15051288943',
  2022: '15051312323',
  2023: '15051331663',
  2024: '15051346563',
  2025: '15051365383',
};

export async function searchByArtist(artistName: string, limit: number = 50): Promise<Song[]> {
  try {
    console.log(`Searching Deezer for artist: ${artistName}`);
    
    // Paso 1: Buscar al artista para obtener su ID
    const artistSearch = await axios.get(`${DEEZER_API}/search/artist`, {
      params: {
        q: artistName,
        limit: 1
      }
    });

    if (!artistSearch.data.data || artistSearch.data.data.length === 0) {
      console.log('Artist not found');
      return [];
    }

    const artist = artistSearch.data.data[0];
    const artistId = artist.id;
    console.log(`Found artist: ${artist.name} (ID: ${artistId})`);

    // Paso 2: Obtener las canciones TOP del artista directamente
    const topTracksResponse = await axios.get(`${DEEZER_API}/artist/${artistId}/top`, {
      params: { limit: limit }
    });

    if (!topTracksResponse.data.data || topTracksResponse.data.data.length === 0) {
      console.log('No top tracks found');
      return [];
    }

    const tracks = topTracksResponse.data.data
      .filter((track: any) => track.preview) // Solo tracks con preview
      .map((track: any) => ({
        id: track.id.toString(),
        name: track.title,
        artist: track.artist.name,
        previewUrl: track.preview,
        albumArt: track.album.cover_big || track.album.cover_medium || track.album.cover,
        spotifyUrl: track.link,
      }));

    console.log(`Found ${tracks.length} tracks with previews for ${artistName}`);
    return tracks;
  } catch (error) {
    console.error('Error in searchByArtist:', error);
    return [];
  }
}

export async function searchByGenre(genre: string, limit: number = 50): Promise<Song[]> {
  try {
    console.log(`Searching Deezer for genre: ${genre}`);
    
    const genreKey = genre.toLowerCase();
    let allTracks: Song[] = [];

    // Obtener artistas clave para este género (solo de GENRE_ARTISTS)
    const genreArtists = GENRE_ARTISTS[genreKey];
    
    if (!genreArtists || genreArtists.length === 0) {
      console.log(`No artists found for genre: ${genre}`);
      return [];
    }

    console.log(`Found ${genreArtists.length} key artists for ${genre}`);

    // Para cada artista, obtener sus TOP canciones
    for (const artistName of genreArtists) {
      if (allTracks.length >= limit) break;

      try {
        // Paso 1: Buscar el ID del artista
        const artistSearchResponse = await axios.get(`${DEEZER_API}/search/artist`, {
          params: {
            q: artistName,
            limit: 1
          }
        });

        if (!artistSearchResponse.data.data || artistSearchResponse.data.data.length === 0) {
          console.log(`Artist not found: ${artistName}`);
          continue;
        }

        const artist = artistSearchResponse.data.data[0];
        console.log(`Found artist: ${artist.name} (searching for "${artistName}")`);

        // Paso 2: Obtener las TOP canciones de este artista
        const topTracksResponse = await axios.get(`${DEEZER_API}/artist/${artist.id}/top`, {
          params: { limit: Math.ceil(limit / Math.max(genreArtists.length, 5)) }
        });

        if (!topTracksResponse.data.data || topTracksResponse.data.data.length === 0) {
          console.log(`No top tracks found for artist: ${artist.name}`);
          continue;
        }

        // Procesar las canciones
        const tracks = topTracksResponse.data.data
          .filter((track: any) => track.preview) // Solo con preview
          .map((track: any) => ({
            id: track.id.toString(),
            name: track.title,
            artist: track.artist.name,
            previewUrl: track.preview,
            albumArt: track.album.cover_big || track.album.cover_medium || track.album.cover,
            spotifyUrl: track.link,
          }));

        console.log(`Added ${tracks.length} tracks from ${artist.name}`);
        allTracks.push(...tracks);

      } catch (e) {
        console.error(`Error fetching artist "${artistName}":`, e);
        continue;
      }
    }

    if (allTracks.length === 0) {
      console.log(`No tracks found for genre: ${genre}`);
      return [];
    }

    console.log(`Found ${allTracks.length} total tracks for ${genre}, returning ${Math.min(allTracks.length, limit)}`);
    return allTracks.slice(0, limit);
  } catch (error) {
    console.error('Error in searchByGenre:', error);
    return [];
  }
}

export async function searchByYear(year: number, limit: number = 100): Promise<Song[]> {
  try {
    const playlistId = yearPlaylistMap[year];

    if (!playlistId) {
      console.log(`No playlist configured for year ${year}`);
      return [];
    }

    console.log(`Fetching playlist for year ${year} (ID: ${playlistId})...`);

    try {
      const res = await axios.get(`${DEEZER_API}/playlist/${playlistId}/tracks`, {
        params: {
          limit: 30, // Cada playlist tiene 25-30 canciones
        },
      });

      if (!res.data.data || res.data.data.length === 0) {
        console.log(`No tracks found in playlist for year ${year}`);
        return [];
      }

      // Filtrar solo los que tienen preview
      const allTracks = res.data.data.filter((t: any) => t.preview);

      console.log(`Got ${allTracks.length} tracks from playlist for year ${year}`);

      // Ordenar por popularidad
      allTracks.sort((a: any, b: any) => (b.nb_fan || 0) - (a.nb_fan || 0));

      // Mapear y filtrar
      const tracks = allTracks
        .filter((track: any) => track.preview && track.title && track.artist)
        .map((track: any) => ({
          id: track.id.toString(),
          name: track.title,
          artist: track.artist.name,
          previewUrl: track.preview,
          albumArt:
            track.album?.cover_big ||
            track.album?.cover_medium ||
            track.album?.cover ||
            '',
          spotifyUrl: track.link,
        }));

      console.log(
        `Final: ${tracks.length} songs from year ${year} (from playlist)`
      );
      return tracks;
    } catch (e) {
      console.error(`Error fetching playlist for year ${year}:`, (e as any).message);
      return [];
    }
  } catch (error) {
    console.error('Error in searchByYear:', error);
    return [];
  }
}

export async function searchByDecade(startYear: number, endYear: number, limit: number = 50): Promise<Song[]> {
  try {
    const decade = `${Math.floor(startYear / 10) * 10}s`;
    console.log(`Searching Deezer for decade: ${decade} (years ${startYear}-${endYear})`);
    
    const allSongs: Song[] = [];
    
    // Obtener canciones de cada año en la década
    for (let year = startYear; year <= endYear; year++) {
      const yearPlaylistId = yearPlaylistMap[year];
      
      if (!yearPlaylistId) {
        console.log(`No playlist found for year ${year}`);
        continue;
      }
      
      try {
        const response = await axios.get(`${DEEZER_API}/playlist/${yearPlaylistId}/tracks`, {
          params: { limit: limit }
        });
        
        if (response.data.data && response.data.data.length > 0) {
          const yearTracks = response.data.data
            .filter((track: any) => track.preview)
            .map((track: any) => ({
              id: track.id.toString(),
              name: track.title,
              artist: track.artist.name,
              previewUrl: track.preview,
              albumArt:
                track.album?.cover_big ||
                track.album?.cover_medium ||
                track.album?.cover ||
                '',
              spotifyUrl: track.link,
            }));
          
          allSongs.push(...yearTracks);
          console.log(`Found ${yearTracks.length} songs from year ${year}`);
        }
      } catch (e) {
        console.error(`Error fetching playlist for year ${year}:`, (e as any).message);
      }
    }
    
    console.log(`Total songs found for decade ${decade}: ${allSongs.length}`);
    return allSongs;
  } catch (error) {
    console.error('Error in searchByDecade:', error);
    return [];
  }
}

export async function getTopTracks(limit: number = 20): Promise<Song[]> {
  try {
    console.log('Getting top tracks from Deezer');
    
    // Obtener el chart global de Deezer
    const response = await axios.get(`${DEEZER_API}/chart/0/tracks`, {
      params: { limit }
    });

    if (!response.data.data || response.data.data.length === 0) {
      console.log('No top tracks found');
      return [];
    }

    const tracks = response.data.data
      .filter((track: any) => track.preview)
      .map((track: any) => ({
        id: track.id.toString(),
        name: track.title,
        artist: track.artist.name,
        previewUrl: track.preview,
        albumArt: track.album.cover_big || track.album.cover_medium || track.album.cover,
        spotifyUrl: track.link,
      }));

    console.log(`Found ${tracks.length} top tracks`);
    return tracks;
  } catch (error) {
    console.error('Error in getTopTracks:', error);
    return [];
  }
}

export async function getTopArtists(limit: number = 20): Promise<Array<{name: string; image: string}>> {
  try {
    // Obtener artistas del chart de Deezer
    const response = await axios.get(`${DEEZER_API}/chart/0/artists`, {
      params: { limit }
    });

    if (!response.data.data || response.data.data.length === 0) {
      return defaultTopArtists();
    }

    return response.data.data.map((artist: any) => ({
      name: artist.name,
      image: artist.picture_medium || artist.picture || artist.picture_small || ''
    }));
  } catch (error) {
    console.error('Error getting top artists:', error);
    return defaultTopArtists();
  }
}

function defaultTopArtists(): Array<{name: string; image: string}> {
  return [
    { name: 'Taylor Swift', image: '' },
    { name: 'Bad Bunny', image: '' },
    { name: 'Drake', image: '' },
    { name: 'The Weeknd', image: '' },
    { name: 'Ariana Grande', image: '' },
    { name: 'Ed Sheeran', image: '' },
    { name: 'Justin Bieber', image: '' },
    { name: 'Billie Eilish', image: '' },
    { name: 'Post Malone', image: '' },
    { name: 'Dua Lipa', image: '' },
    { name: 'Olivia Rodrigo', image: '' },
    { name: 'Harry Styles', image: '' },
    { name: 'BTS', image: '' },
    { name: 'Coldplay', image: '' },
    { name: 'Imagine Dragons', image: '' },
    { name: 'Maroon 5', image: '' },
    { name: 'Rihanna', image: '' },
    { name: 'Eminem', image: '' },
    { name: 'Kanye West', image: '' },
    { name: 'Beyoncé', image: '' }
  ];
}

export async function searchArtists(query: string, limit: number = 10): Promise<Array<{name: string; image: string}>> {
  if (!query || query.length < 2) return [];
  
  try {
    const response = await axios.get(`${DEEZER_API}/search/artist`, {
      params: { q: query, limit }
    });

    if (!response.data.data || response.data.data.length === 0) {
      return [];
    }

    return response.data.data.map((artist: any) => ({
      name: artist.name,
      image: artist.picture_medium || artist.picture || artist.picture_small || ''
    }));
  } catch (error) {
    console.error('Error searching artists:', error);
    return [];
  }
}

export async function getTopGenres(limit: number = 20): Promise<string[]> {
  // Obtener solo los géneros que están en GENRE_ARTISTS
  const genres = Object.keys(GENRE_ARTISTS);
  console.log(`Returning ${Math.min(genres.length, limit)} genres from GENRE_ARTISTS`);
  return genres.slice(0, limit);
}

export async function searchGenres(query: string): Promise<string[]> {
  // Buscar géneros solo en GENRE_ARTISTS
  if (!query || query.length < 1) {
    return getTopGenres(30);
  }

  console.log(`Searching genres for query: ${query}`);
  
  // Filtrar géneros según la búsqueda
  const genres = Object.keys(GENRE_ARTISTS)
    .filter((g: string) => g.includes(query.toLowerCase()));
  
  console.log(`Found ${genres.length} genres matching "${query}"`);
  return genres;
}
