'use strict';

// Balanced Trivia Rescue bank: 200 questions total.
// The majority are easy/common knowledge, with a smaller medium/hard group.
const balancedTriviaQuestions=[];

function addTriviaQuestion(q,correct,wrongs){
  const options=[correct,...wrongs.filter(x=>x!==correct)].slice(0,4);
  while(options.length<4) options.push('None of these');
  const shift=balancedTriviaQuestions.length%4;
  const answers=options.slice(shift).concat(options.slice(0,shift));
  balancedTriviaQuestions.push({q,a:answers,c:answers.indexOf(correct)});
}

function addFromPairs(pairs,prompt){
  const answers=pairs.map(x=>x[1]);
  pairs.forEach((item,i)=>{
    const wrongs=[answers[(i+1)%answers.length],answers[(i+7)%answers.length],answers[(i+13)%answers.length]];
    addTriviaQuestion(prompt(item[0]),item[1],wrongs);
  });
}

// 40 easy world-capital questions.
const capitalPairs=[
  ['France','Paris'],['Italy','Rome'],['Spain','Madrid'],['Germany','Berlin'],['Japan','Tokyo'],
  ['Canada','Ottawa'],['Australia','Canberra'],['Mexico','Mexico City'],['Brazil','Brasília'],['Argentina','Buenos Aires'],
  ['United Kingdom','London'],['Ireland','Dublin'],['Portugal','Lisbon'],['Greece','Athens'],['Norway','Oslo'],
  ['Sweden','Stockholm'],['Finland','Helsinki'],['Denmark','Copenhagen'],['Netherlands','Amsterdam'],['Belgium','Brussels'],
  ['Austria','Vienna'],['Poland','Warsaw'],['Czech Republic','Prague'],['Hungary','Budapest'],['Iceland','Reykjavík'],
  ['China','Beijing'],['India','New Delhi'],['South Korea','Seoul'],['Thailand','Bangkok'],['Vietnam','Hanoi'],
  ['Egypt','Cairo'],['Kenya','Nairobi'],['Morocco','Rabat'],['Nigeria','Abuja'],['South Africa','Pretoria'],
  ['New Zealand','Wellington'],['Chile','Santiago'],['Peru','Lima'],['Colombia','Bogotá'],['Switzerland','Bern']
];
addFromPairs(capitalPairs,country=>`What is the capital of ${country}?`);

// 20 easy U.S. state-capital questions.
const stateCapitalPairs=[
  ['Pennsylvania','Harrisburg'],['New York','Albany'],['California','Sacramento'],['Texas','Austin'],['Florida','Tallahassee'],
  ['Ohio','Columbus'],['Georgia','Atlanta'],['Massachusetts','Boston'],['Colorado','Denver'],['Arizona','Phoenix'],
  ['Hawaii','Honolulu'],['Alaska','Juneau'],['Tennessee','Nashville'],['Louisiana','Baton Rouge'],['Indiana','Indianapolis'],
  ['Michigan','Lansing'],['Wisconsin','Madison'],['Oregon','Salem'],['Washington','Olympia'],['Nevada','Carson City']
];
addFromPairs(stateCapitalPairs,state=>`What is the capital of ${state}?`);

// 20 easy city-to-country questions.
const cityCountryPairs=[
  ['Venice','Italy'],['Barcelona','Spain'],['Paris','France'],['Munich','Germany'],['Sydney','Australia'],
  ['Rio de Janeiro','Brazil'],['Toronto','Canada'],['Osaka','Japan'],['Mumbai','India'],['Cairo','Egypt'],
  ['Dublin','Ireland'],['Lisbon','Portugal'],['Athens','Greece'],['Amsterdam','Netherlands'],['Vienna','Austria'],
  ['Prague','Czech Republic'],['Bangkok','Thailand'],['Lima','Peru'],['Nairobi','Kenya'],['Stockholm','Sweden']
];
addFromPairs(cityCountryPairs,city=>`Which country is ${city} in?`);

// 40 mostly easy common-knowledge questions.
[
  ['What is the largest planet in our solar system?','Jupiter',['Mars','Earth','Venus']],
  ['Which planet is known as the Red Planet?','Mars',['Mercury','Saturn','Neptune']],
  ['Which planet is closest to the Sun?','Mercury',['Venus','Earth','Mars']],
  ['Which planet is famous for its rings?','Saturn',['Mars','Venus','Mercury']],
  ['What is the name of our galaxy?','Milky Way',['Andromeda','Orion','Sombrero']],
  ['What gas do humans need to breathe?','Oxygen',['Helium','Hydrogen','Carbon dioxide']],
  ['What gas do plants absorb from the air?','Carbon dioxide',['Oxygen','Helium','Hydrogen']],
  ['What is frozen water called?','Ice',['Steam','Mist','Rain']],
  ['How many sides does a triangle have?','3',['4','5','6']],
  ['How many sides does a hexagon have?','6',['5','7','8']],
  ['How many degrees are in a right angle?','90',['45','60','180']],
  ['How many letters are in the English alphabet?','26',['24','25','27']],
  ['How many minutes are in an hour?','60',['30','45','90']],
  ['How many hours are in a day?','24',['12','18','30']],
  ['How many months are in a year?','12',['10','11','13']],
  ['Which animal is the largest land animal?','Elephant',['Giraffe','Rhino','Hippo']],
  ['Which animal is the fastest land animal?','Cheetah',['Lion','Horse','Gazelle']],
  ['Which animal is known for building dams?','Beaver',['Otter','Fox','Raccoon']],
  ['Which animal carries its baby in a pouch?','Kangaroo',['Lion','Panda','Horse']],
  ['Which animal is famous for black and white stripes?','Zebra',['Tiger','Panda','Skunk']],
  ['Which animal has eight legs?','Spider',['Ant','Crab','Beetle']],
  ['Which animal is famous for eating bamboo?','Panda',['Koala','Tiger','Moose']],
  ['What do bees make?','Honey',['Milk','Silk','Bread']],
  ['What do caterpillars turn into?','Butterflies',['Bees','Birds','Spiders']],
  ['Which organ pumps blood through the body?','Heart',['Liver','Brain','Kidney']],
  ['Which organs are mainly used for breathing?','Lungs',['Kidneys','Stomach','Pancreas']],
  ['Which organ controls most body functions?','Brain',['Heart','Liver','Lungs']],
  ['What is H2O commonly called?','Water',['Salt','Hydrogen','Oxygen']],
  ['Which metal is commonly used in electrical wiring?','Copper',['Lead','Mercury','Tin']],
  ['What color are emeralds?','Green',['Red','Blue','Purple']],
  ['Which sport is played at Wimbledon?','Tennis',['Golf','Rugby','Baseball']],
  ['Which sport uses a puck?','Hockey',['Soccer','Baseball','Tennis']],
  ['Which sport uses touchdowns?','American football',['Baseball','Soccer','Hockey']],
  ['How many players are on the court for one basketball team?','5',['4','6','7']],
  ['How many points is a touchdown worth before the extra point?','6',['3','7','8']],
  ['Which country has a maple leaf on its flag?','Canada',['France','Sweden','Austria']],
  ['Which country is shaped like a boot?','Italy',['Greece','Portugal','Norway']],
  ['Which country is known for kangaroos?','Australia',['India','Canada','Brazil']],
  ['Which country is home to the Great Pyramids of Giza?','Egypt',['Greece','Mexico','India']],
  ['Which country is home to Mount Fuji?','Japan',['China','Thailand','South Korea']]
].forEach(x=>addTriviaQuestion(x[0],x[1],x[2]));

// 60 easy math questions: 20 addition, 20 subtraction, 20 multiplication.
for(let i=0;i<20;i++){
  const a=10+i,b=4+(i%8),answer=a+b;
  addTriviaQuestion(`What is ${a} + ${b}?`,String(answer),[String(answer-1),String(answer+1),String(answer+2)]);
}
for(let i=0;i<20;i++){
  const a=30+i,b=6+(i%9),answer=a-b;
  addTriviaQuestion(`What is ${a} - ${b}?`,String(answer),[String(answer-1),String(answer+1),String(answer+3)]);
}
for(let i=0;i<20;i++){
  const a=2+(i%10),b=3+Math.floor(i/10)*4+(i%2),answer=a*b;
  addTriviaQuestion(`What is ${a} × ${b}?`,String(answer),[String(answer-a),String(answer+b),String(answer+a)]);
}

// 20 medium/hard questions mixed into the larger easy pool.
[
  ['Which scientist developed the theory of general relativity?','Albert Einstein',['Isaac Newton','Niels Bohr','Galileo Galilei']],
  ['What is the chemical symbol for gold?','Au',['Ag','Gd','Go']],
  ['Which river runs through London?','Thames',['Seine','Danube','Rhine']],
  ['Who wrote Romeo and Juliet?','William Shakespeare',['Charles Dickens','Jane Austen','Mark Twain']],
  ['What is the largest internal organ in the human body?','Liver',['Heart','Lung','Brain']],
  ['Which country gifted the Statue of Liberty to the United States?','France',['Spain','Italy','Canada']],
  ['Which U.S. state is largest by area?','Alaska',['Texas','California','Montana']],
  ['Which element has the chemical symbol Na?','Sodium',['Nitrogen','Neon','Nickel']],
  ['Which ancient civilization built Machu Picchu?','Inca',['Maya','Aztec','Roman']],
  ['Who painted the Mona Lisa?','Leonardo da Vinci',['Michelangelo','Raphael','Donatello']],
  ['Which blood type is commonly called the universal red-cell donor?','O-',['A+','AB+','B-']],
  ['Who discovered penicillin?','Alexander Fleming',['Marie Curie','Louis Pasteur','Gregor Mendel']],
  ['Which mountain is the highest in Africa?','Kilimanjaro',['Mount Kenya','Ras Dashen','Atlas Peak']],
  ['Which programming language was created by Guido van Rossum?','Python',['Java','C++','Ruby']],
  ['Which scientist proposed the three laws of planetary motion?','Johannes Kepler',['Tycho Brahe','Galileo Galilei','Nicolaus Copernicus']],
  ['What is the atomic number of gold?','79',['47','82','92']],
  ['Which physicist formulated the uncertainty principle?','Werner Heisenberg',['Max Planck','Niels Bohr','Erwin Schrödinger']],
  ['What is the time complexity of binary search on a sorted array?','O(log n)',['O(1)','O(n)','O(n²)']],
  ['Who wrote One Hundred Years of Solitude?','Gabriel García Márquez',['Jorge Luis Borges','Pablo Neruda','Mario Vargas Llosa']],
  ['What is Avogadro’s number approximately?','6.02 × 10²³',['3.00 × 10⁸','9.81 × 10²','1.60 × 10⁻¹⁹']]
].forEach(x=>addTriviaQuestion(x[0],x[1],x[2]));

// Exactly 200 questions. Ten are selected per run, so the player gets 20 full
// runs without seeing a repeat. The seen list persists in the local save.
newTriviaRun=function(){
  if(!Array.isArray(state.triviaSeen)) state.triviaSeen=[];
  let unseen=balancedTriviaQuestions.filter(q=>!state.triviaSeen.includes(q.q));
  if(unseen.length<10){
    state.triviaSeen=[];
    unseen=[...balancedTriviaQuestions];
  }
  const questions=shuffle([...unseen]).slice(0,10);
  state.triviaSeen.push(...questions.map(q=>q.q));
  save();
  trivia={questions,index:0,streak:0,pot:0,locked:false};
};
