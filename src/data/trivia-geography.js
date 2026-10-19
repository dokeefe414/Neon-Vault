import {factGroup,quiz} from './trivia-factory.js';
const C='Geography';
const capitalAdditions=factGroup(C,'What is the capital of {item}?',[
 ['Turkey','Ankara'],['Saudi Arabia','Riyadh'],['United Arab Emirates','Abu Dhabi'],['Israel','Jerusalem'],['Jordan','Amman'],['Lebanon','Beirut'],['Pakistan','Islamabad'],['Bangladesh','Dhaka'],['Nepal','Kathmandu'],['Sri Lanka','Sri Jayawardenepura Kotte'],['Malaysia','Kuala Lumpur'],['Singapore','Singapore'],['Indonesia','Jakarta'],['Philippines','Manila'],['Mongolia','Ulaanbaatar'],['Cambodia','Phnom Penh'],['Laos','Vientiane'],['Myanmar','Naypyidaw'],['Kazakhstan','Astana'],['Uzbekistan','Tashkent'],['Ukraine','Kyiv'],['Romania','Bucharest'],['Bulgaria','Sofia'],['Serbia','Belgrade'],['Croatia','Zagreb'],['Slovakia','Bratislava'],['Slovenia','Ljubljana'],['Estonia','Tallinn'],['Latvia','Riga'],['Lithuania','Vilnius'],['Ethiopia','Addis Ababa'],['Ghana','Accra'],['Uganda','Kampala'],['Senegal','Dakar'],['Tunisia','Tunis'],['Algeria','Algiers'],['Cameroon','Yaoundé'],['Tanzania','Dodoma'],['Zambia','Lusaka'],['Zimbabwe','Harare']
], 'easy');
const landmarks=factGroup(C,'In which country would you find {item}?',[
 ['Angkor Wat','Cambodia'],['Petra','Jordan'],['Chichén Itzá','Mexico'],['the Taj Mahal','India'],['the Colosseum','Italy'],['the Acropolis of Athens','Greece'],['the Burj Khalifa','United Arab Emirates'],['the Great Barrier Reef','Australia'],['Mount Kilimanjaro','Tanzania'],['the Cliffs of Moher','Ireland'],['the Blue Lagoon geothermal spa','Iceland'],['the Sagrada Família','Spain'],['Mont Saint-Michel','France'],['the Forbidden City','China'],['the Golden Gate Bridge','United States'],['Table Mountain','South Africa'],['Uluru','Australia'],['the Nazca Lines','Peru'],['Hagia Sophia','Turkey'],['the Great Sphinx of Giza','Egypt']
],'medium');
const physical=quiz(C,[
 ['Which ocean is the largest by surface area?','Pacific Ocean','Atlantic Ocean','Indian Ocean','Arctic Ocean','easy'],
 ['Which continent contains the Sahara Desert?','Africa','Asia','South America','Australia','easy'],
 ['Which continent is the driest overall?','Antarctica','Africa','Australia','Europe','medium'],
 ['Which ocean separates Africa from Australia?','Indian Ocean','Pacific Ocean','Arctic Ocean','Southern Ocean','easy'],
 ['Which major river flows through Egypt into the Mediterranean?','Nile','Danube','Amazon','Rhine','easy'],
 ['What is the world’s largest hot desert?','Sahara','Gobi','Kalahari','Arabian Desert','medium'],
 ['Which sea lies between Europe and North Africa?','Mediterranean Sea','Caribbean Sea','Baltic Sea','Coral Sea','easy'],
 ['Which mountain range includes Mount Everest?','Himalayas','Andes','Alps','Rockies','easy'],
 ['What is the longest mountain range on land?','Andes','Alps','Himalayas','Rockies','medium'],
 ['Which line of latitude is at 0 degrees?','Equator','Tropic of Cancer','Arctic Circle','Prime Meridian','easy'],
 ['Which line of longitude is at 0 degrees?','Prime Meridian','Equator','International Date Line','Tropic of Capricorn','easy'],
 ['Which imaginary line is approximately opposite the Prime Meridian?','180th meridian','Equator','Arctic Circle','Tropic of Cancer','medium'],
 ['Which strait connects the Mediterranean Sea to the Atlantic Ocean?','Strait of Gibraltar','Bering Strait','Strait of Hormuz','Bosporus','medium'],
 ['What body of water separates Alaska and Russia?','Bering Strait','English Channel','Strait of Malacca','Gulf of Aden','medium'],
 ['Which country has the greatest number of natural lakes?','Canada','Norway','Russia','Finland','medium'],
 ['Which country spans both Europe and Asia across the Bosporus?','Turkey','Spain','Morocco','Portugal','easy'],
 ['What is the deepest known point in Earth’s oceans?','Challenger Deep','Puerto Rico Trench','Java Trench','Tonga Trench','hard'],
 ['Which lake is the largest by surface area?','Caspian Sea','Lake Superior','Lake Victoria','Lake Baikal','medium'],
 ['Which lake contains the most liquid freshwater by volume?','Lake Baikal','Lake Superior','Lake Victoria','Lake Michigan','hard'],
 ['What is the name of the fertile river delta in northern Egypt?','Nile Delta','Okavango Delta','Mekong Delta','Ganges Delta','medium'],
 ['Which country has a coastline on the Bay of Bengal?','Bangladesh','Bolivia','Mongolia','Austria','medium'],
 ['Which country borders both Germany and Italy?','Austria','Belgium','Portugal','Sweden','medium'],
 ['Which South American country has no Atlantic or Pacific coastline?','Bolivia','Chile','Ecuador','Uruguay','medium'],
 ['What is the capital city of the Canadian province of Ontario?','Toronto','Ottawa','Montreal','Vancouver','medium'],
 ['What mountain divides much of Europe and Asia conventionally?','Ural Mountains','Andes','Alps','Atlas Mountains','hard']
]);
export const geographyExtra=[...capitalAdditions,...landmarks,...physical];
