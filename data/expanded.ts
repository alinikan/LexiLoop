import { moreWords } from './more-words';
import { validateWord, type Word } from '@/lib/ai/schemas';
// Original teaching material. Levels are editorial estimates, not certified CEFR ratings.
// Format: word | level | part of speech | explanation | everyday example | second example.
const source = `
comfortable|A2|adjective|feeling relaxed and free from physical discomfort|These shoes are comfortable enough for a long walk.|The detective settled into a comfortable chair to read the letter.
offer|A2|verb|to say you are willing to give something or do something|I can offer you a lift to the station.|The friendly traveler decided to offer the tired guard some tea.
suitable|A2|adjective|right or appropriate for a particular purpose|Is this jacket suitable for cold weather?|The hero searched for a suitable place to hide the enormous hat.
suggest|A2|verb|to put forward an idea for someone to consider|May I suggest a quieter place to meet?|The assistant chose to suggest a much simpler escape plan.
prepare|A2|verb|to get ready for something|I prepare my lunch the evening before work.|The crew had one hour to prepare for the visitor.
recognize|A2|verb|to know someone or something because you have encountered them before|I recognize that song from our road trip.|The guard failed to recognize the captain in a borrowed coat.
support|A2|verb|to help someone with encouragement or practical assistance|My friends support my decision to change careers.|The team agreed to support the nervous new player.
worthwhile|A2|adjective|valuable enough to justify the time or effort involved|Learning to cook has been a worthwhile effort.|The long search proved worthwhile when the crew found a safe harbor.
aberration|C1|noun|a departure from what is normal or expected|The missing payment was an aberration in an otherwise reliable system.|One bad rehearsal was an aberration, not a reason to cancel the play.
acquiesce|C1|verb|to accept something reluctantly without arguing further|I will not acquiesce simply because everyone else agrees.|The captain refused to acquiesce to the crew's unreasonable demand.
acrimonious|C1|adjective|angry and full of bitter disagreement|Their discussion became acrimonious when money came up.|The reunion ended in an acrimonious argument about an old debt.
adroit|C1|adjective|skillful at handling a situation or task|Her adroit reply kept the meeting friendly.|An adroit move let the player escape the trap.
affable|C1|adjective|friendly and easy to talk to|Our new neighbor is affable and remembers everyone's name.|The affable innkeeper welcomed even the grumpiest traveler.
ambivalent|C1|adjective|having conflicting feelings about the same thing|I feel ambivalent about moving closer to work but farther from friends.|She was ambivalent about winning a prize that required giving a speech.
anachronism|C1|noun|something that belongs to a different historical period|A smartphone in that medieval scene is an anachronism.|The detective spotted an anachronism in the supposedly ancient painting.
antithesis|C1|noun|the exact opposite of something|His chaotic desk is the antithesis of her tidy workspace.|The peaceful gardener was the antithesis of the noisy pirate next door.
apocryphal|C1|adjective|widely repeated but of doubtful truth or authenticity|That story about the founder may be apocryphal.|The bartender's apocryphal tale grew longer every time he told it.
arbitrary|C1|adjective|based on personal choice rather than a clear reason or rule|The fee seems arbitrary because nobody can explain it.|The king's arbitrary rules changed whenever he lost a game.
assiduous|C1|adjective|showing persistent care and effort|Her assiduous preparation made the interview less stressful.|The assiduous apprentice checked every bottle before opening the shop.
austere|C1|adjective|plain and strict, without comfort or decoration|The room felt austere with bare walls and one wooden chair.|The villain's austere office contained only a desk and a clock.
bellicose|C1|adjective|eager to argue or fight|His bellicose tone made a minor disagreement worse.|The bellicose knight challenged the door guard to a duel.
benign|C1|adjective|not harmful or threatening in the situation described|Her comment had a benign intention despite sounding awkward.|The ominous noise had a benign source: a snoring cat.
brevity|C1|noun|the quality of expressing something in few words|I appreciated the brevity of the update.|The actor thanked everyone with unusual brevity and left the stage.
cacophony|C1|noun|a harsh mixture of many clashing sounds|The construction site produced a cacophony all morning.|The band's first rehearsal was a cacophony of drums and arguments.
capricious|C1|adjective|changing suddenly and unpredictably|The capricious weather ruined our picnic plans.|The capricious wizard changed the destination halfway through the journey.
circumspect|C1|adjective|careful to consider risks before acting or speaking|Be circumspect about sharing unconfirmed news.|The detective gave a circumspect answer while the suspect listened.
cogent|C1|adjective|clear, logical, and convincing|She offered a cogent explanation for delaying the launch.|The intern's cogent argument finally persuaded the stubborn manager.
complacent|C1|adjective|too satisfied with yourself to notice a need for improvement|We cannot become complacent after one successful month.|The complacent champion stopped training and lost the rematch.
conflation|C1|noun|the mistaken combining of things that should be distinguished|That argument relies on a conflation of popularity and quality.|The host's conflation of two guests' careers caused an awkward introduction.
conundrum|C1|noun|a difficult problem with no obvious solution|Finding a date everyone can attend is a conundrum.|The locked room presented the detective with a conundrum.
corroborate|C1|verb|to support an account with additional evidence|The receipts corroborate her explanation of the expenses.|A muddy footprint could corroborate the gardener's story.
credulous|C1|adjective|too ready to believe things without checking them|A credulous reader might accept that rumor as fact.|The credulous guard believed the thief was a visiting prince.
cursory|C1|adjective|done quickly without close attention to detail|A cursory glance did not reveal the mistake.|The guard gave the suitcase a cursory inspection and waved them through.
dearth|C1|noun|a shortage of something needed or wanted|There is a dearth of affordable apartments nearby.|A dearth of clues left the detective questioning the parrot.
deference|C1|noun|respectful acceptance of another person's judgment or wishes|We changed the schedule in deference to the host's wishes.|The apprentice bowed in deference to the visiting master.
deleterious|C1|adjective|causing damage or harm|Constant interruptions have a deleterious effect on my concentration.|The experiment had a deleterious effect on every plant in the room.
demur|C1|verb|to express an objection or hesitation|I must demur when the plan depends on unpaid overtime.|The usually obedient assistant chose to demur at the ridiculous request.
derivative|C1|adjective|based too heavily on existing work to seem original|The plot feels derivative despite the excellent acting.|The director rejected a derivative script about yet another chosen hero.
dichotomy|C1|noun|a division into two sharply contrasting groups or ideas|The debate creates a false dichotomy between speed and quality.|The hero rejected the dichotomy of surrender or certain defeat.
diffident|C1|adjective|lacking confidence in expressing yourself|His diffident manner hid a strong understanding of the topic.|The diffident musician played beautifully once the curtain rose.
disingenuous|C1|adjective|pretending to be sincere or unaware when you are not|It is disingenuous to claim the fee was clearly advertised.|The thief's disingenuous apology fooled nobody in the room.
dissonance|C1|noun|a clash or lack of agreement between things|There is dissonance between the company's promises and its actions.|The cheerful music created dissonance with the character's bad news.
dogmatic|C1|adjective|insisting that your beliefs are correct without considering alternatives|A dogmatic approach makes discussion difficult.|The dogmatic coach refused to try the team's new strategy.
ebullient|C1|adjective|cheerful and full of excited energy|She sounded ebullient after receiving the offer.|The ebullient host greeted each guest as if they had won a prize.
eclectic|C1|adjective|drawing from a wide variety of styles or sources|Her playlist is eclectic, mixing jazz with electronic music.|The detective's eclectic collection included maps, puppets, and antique spoons.
efficacy|C1|noun|the ability to produce the intended result|We need evidence of the training's efficacy.|The wizard demonstrated the spell's efficacy by unlocking the gate.
egregious|C1|adjective|extremely bad and clearly unacceptable|Charging twice for the same service was an egregious error.|The referee missed an egregious foul in front of the whole crowd.
elucidate|C1|verb|to make something clearer by explaining it|Could you elucidate the reasoning behind that decision?|The professor used a sandwich to elucidate the complicated theory.
enervating|C1|adjective|draining your energy or strength|The long, humid commute was enervating.|The enervating desert journey left the adventurers barely able to argue.
ephemeral|C1|adjective|lasting for only a very short time|Online attention can be ephemeral.|The magician's ephemeral castle vanished before anyone reached the door.
equivocal|C1|adjective|unclear or open to more than one interpretation|His equivocal response did not tell us whether he agreed.|The witness gave an equivocal answer and glanced toward the exit.
erudite|C1|adjective|showing extensive knowledge gained through study|Her erudite essay connected history with modern design.|The erudite librarian recognized the inscription immediately.
esoteric|C1|adjective|understood or appreciated by only a small specialized group|The discussion became too esoteric for new members.|The puzzle depended on an esoteric rule known only to the old players.
exacerbate|C1|verb|to make an existing problem worse|Skipping breaks can exacerbate fatigue.|The manager's joke only served to exacerbate the disagreement.
exculpate|C1|verb|to show that someone is not responsible for wrongdoing|The footage could exculpate the accused employee.|The detective found a receipt that might exculpate the chef.
exigent|C1|adjective|requiring urgent action or attention|The team redirected funds to meet an exigent need.|An exigent threat forced the rival captains to work together.
fastidious|C1|adjective|very attentive to detail and hard to satisfy|He is fastidious about keeping the shared kitchen clean.|The fastidious butler noticed that a single fork was out of place.
fatuous|C1|adjective|foolish in a way that ignores obvious reality|The claim that planning is always unnecessary is fatuous.|The villain gave a fatuous speech while the heroes escaped behind him.
fortuitous|C1|adjective|happening by chance rather than through planning|A fortuitous meeting led to a new job.|Their fortuitous discovery of a spare key ended the adventure early.
fractious|C1|adjective|irritable and likely to argue or cause trouble|The group became fractious after hours of delays.|A fractious crew argued over who had eaten the last biscuit.
garrulous|C1|adjective|talking a great deal, especially about unimportant things|Our garrulous seatmate described every stop on his trip.|The garrulous guard accidentally revealed the secret password.
germane|C1|adjective|directly relevant to the matter being discussed|That question is germane to our decision.|The detective ignored the gossip and asked for facts germane to the case.
grandiloquent|C1|adjective|using elaborate language to sound impressive|The grandiloquent announcement made a small update sound historic.|The mayor delivered a grandiloquent speech about a new park bench.
hubris|C1|noun|excessive pride that leads to poor judgment|His hubris kept him from asking for help.|The villain's hubris made him explain the escape route to his prisoners.
idiosyncrasy|C1|noun|a distinctive habit or feature peculiar to someone or something|Labeling every cable is one of her useful quirks, an idiosyncrasy.|The detective's habit of interviewing plants was an odd idiosyncrasy.
immutable|C1|adjective|unable to change or be changed|The deadline is not immutable; we can discuss it.|The wizard discovered that the supposedly immutable rule had an exception.
impasse|C1|noun|a situation in which no progress can be made|The negotiations reached an impasse over delivery dates.|The two captains stood at an impasse until the cook proposed a compromise.
impecunious|C1|adjective|having very little money|As an impecunious student, I borrowed most of my books.|The impecunious inventor paid the rent with a homemade alarm clock.
impervious|C1|adjective|unaffected by something or unable to be penetrated by it|She seemed impervious to the criticism.|The monster was impervious to arrows but terrified of loud music.
impetuous|C1|adjective|acting quickly without considering consequences|An impetuous purchase left me with a bicycle I never use.|The impetuous hero opened the glowing chest without reading the warning.
implacable|C1|adjective|impossible to calm, satisfy, or persuade to stop opposing something|They faced an implacable opponent of the proposal.|The hero's implacable rival followed every clue to the final showdown.
incongruous|C1|adjective|out of place or inconsistent with the surroundings|The neon sign looked incongruous in the old library.|The knight's pink slippers were incongruous with his imposing armor.
ineffable|C1|adjective|too great or intense to express adequately in words|She described an ineffable joy at seeing her family again.|The traveler stood in ineffable wonder beneath the floating city.
inexorable|C1|adjective|continuing in a way that cannot be stopped or persuaded to change|The inexorable rise in rent forced us to move.|The clock's inexorable ticking made the final puzzle more tense.
ingenuous|C1|adjective|innocent, sincere, and without deception|Her ingenuous question exposed a problem everyone else had ignored.|The child's ingenuous remark silenced the boastful king.
inimical|C1|adjective|harmful or strongly opposed to something|Constant secrecy is inimical to trust.|The frozen wasteland was inimical to the party's survival.
inscrutable|C1|adjective|impossible or difficult to understand or interpret|His inscrutable expression gave nothing away.|The dealer's inscrutable smile made every player nervous.
intransigent|C1|adjective|refusing to change your position or compromise|An intransigent supplier made the negotiations difficult.|The intransigent queen would not reopen the bridge.
inveterate|C1|adjective|having a long-established habit that is unlikely to change|My brother is an inveterate list-maker.|The inveterate gambler turned a quiet dinner into a competition.
juxtaposition|C1|noun|placing contrasting things side by side to highlight their differences|The juxtaposition of old photos and new buildings was striking.|The film used the juxtaposition of a banquet and an empty pantry to make its point.
laconic|C1|adjective|using very few words|His laconic reply was simply yes.|The laconic detective solved the case and said only, Check the clock.
loquacious|C1|adjective|very talkative|Our loquacious guide kept us entertained throughout the delay.|The loquacious robot narrated every step of the rescue.
magnanimous|C1|adjective|generous and forgiving, especially toward a rival|She was magnanimous in defeat and congratulated the winner.|The magnanimous champion offered to train the player who had challenged him.
mendacious|C1|adjective|dishonest or deliberately untruthful|The advertisement made a mendacious claim about guaranteed results.|The mendacious witness invented a different story every hour.
mercurial|C1|adjective|changing mood or behavior quickly and unpredictably|His mercurial temperament made collaboration tiring.|The mercurial director praised the scene, then demanded a complete rewrite.
mitigate|C1|verb|to reduce the severity or harmful effects of something|A clear schedule can mitigate the stress of moving.|The team built a shelter to mitigate the storm's effects.
nebulous|C1|adjective|vague and not clearly defined|The project still has a nebulous set of goals.|The villain's nebulous plan involved a crown, a magnet, and considerable luck.
obdurate|C1|adjective|stubbornly refusing to change despite persuasion|The landlord remained obdurate despite our reasonable request.|The obdurate guard refused entry even after recognizing the prince.
obfuscate|C1|verb|to make something harder to understand, often deliberately|Extra jargon can obfuscate a simple explanation.|The suspect tried to obfuscate the timeline with irrelevant details.
obsequious|C1|adjective|excessively eager to please or obey someone important|The obsequious praise made the manager uncomfortable.|The obsequious assistant laughed before the king finished the joke.
ostensible|C1|adjective|stated or appearing to be true, though possibly hiding another reality|The ostensible reason for the visit was to return a book.|The spy's ostensible mission was to inspect the kitchen.
parsimonious|C1|adjective|extremely unwilling to spend money or resources|The parsimonious owner refused to replace broken chairs.|The parsimonious dragon counted every coin before buying a candle.
pedantic|C1|adjective|overly concerned with minor details or rules|Correcting every informal phrase can sound pedantic.|The pedantic wizard interrupted the battle to correct the spell's pronunciation.
perfunctory|C1|adjective|done as a routine with little care or interest|The apology felt perfunctory rather than sincere.|The guard made a perfunctory search and missed the enormous hidden map.
perspicacious|C1|adjective|quick to notice and understand things accurately|Her perspicacious questions revealed the real problem.|The perspicacious child noticed that the supposed ghost wore muddy boots.
pertinent|C1|adjective|relevant to the particular matter at hand|Please include only the details pertinent to the request.|The detective found one pertinent note among hundreds of shopping lists.
placate|C1|verb|to make someone less angry or upset|A refund may help placate the disappointed customer.|The cook tried to placate the dragon with a second dessert.
platitude|C1|noun|an overused statement that offers little meaningful help|The advice sounded like a platitude rather than a practical solution.|The captain answered the crisis with a platitude about teamwork.
precipitous|C1|adjective|very steep or happening suddenly and sharply|The business suffered a precipitous fall in sales.|The hikers stopped at the edge of a precipitous cliff.
prevaricate|C1|verb|to avoid giving a direct truthful answer|Please do not prevaricate when a clear answer is possible.|The witness began to prevaricate when asked about the missing key.
probity|C1|noun|complete honesty and strong moral principles|Her reputation for probity made her a trusted treasurer.|The judge's probity was tested by a suitcase full of gold.
proclivity|C1|noun|a natural tendency toward a particular behavior|I have a proclivity for taking on too many projects.|The robot's proclivity for collecting shiny objects delayed the mission.
prosaic|C1|adjective|ordinary and lacking excitement or imagination|The explanation was prosaic: the battery was dead.|The mysterious noise had a prosaic cause, a loose window latch.
querulous|C1|adjective|complaining in an irritated or whining way|His querulous messages made a small delay exhausting.|The querulous passenger objected to the seat, the weather, and the moon.
quixotic|C1|adjective|idealistic in a way that is impractical or unlikely to succeed|Finishing the entire renovation in a weekend was a quixotic ambition.|The knight began a quixotic quest to teach every dragon table manners.
recalcitrant|C1|adjective|stubbornly resisting authority or control|The recalcitrant committee member rejected every compromise.|The recalcitrant robot refused to return the captain's hat.
reticent|C1|adjective|unwilling to share thoughts or feelings freely|She is reticent about her private life.|The reticent witness finally spoke when the detective mentioned the dog.
sagacious|C1|adjective|showing sound judgment and practical wisdom|It was a sagacious decision to keep a reserve fund.|The sagacious elder chose negotiation over another costly battle.
salient|C1|adjective|most noticeable or important in the situation|The report highlights the salient differences between the plans.|The detective underlined the salient clue: the clock had stopped at noon.
sanctimonious|C1|adjective|acting as though morally superior to other people|His sanctimonious lecture annoyed the colleagues who did the actual work.|The sanctimonious villain scolded the heroes for littering during his escape.
scrupulous|C1|adjective|very careful to act correctly and honestly|She keeps scrupulous records of every expense.|The scrupulous merchant returned a coin the traveler had overpaid.
serendipity|C1|noun|the chance discovery of something valuable or pleasant|Finding my favorite book in that tiny shop was pure serendipity.|Through serendipity, the lost traveler stumbled upon the hidden festival.
solicitous|C1|adjective|showing attentive care or concern for someone|Our solicitous host checked that everyone had a comfortable seat.|The solicitous robot offered the exhausted captain a blanket.
spurious|C1|adjective|false or not based on sound evidence|The article makes a spurious connection between two unrelated events.|The merchant offered a spurious certificate claiming the spoon was magical.
tacit|C1|adjective|understood without being stated directly|We had a tacit agreement to take turns cleaning.|A nod signaled their tacit agreement to keep the dragon a secret.
tenable|C1|adjective|able to be defended with reason or evidence|That explanation is no longer tenable after the new findings.|The suspect's story was tenable until the detective found the train ticket.
trenchant|C1|adjective|expressed sharply and effectively|Her trenchant criticism identified the proposal's central weakness.|The critic delivered a trenchant review of the king's terrible play.
ubiquitous|C1|adjective|present or encountered almost everywhere|Wireless earbuds have become ubiquitous on my commute.|The company's ubiquitous logo appeared even on the villain's lunchbox.
unequivocal|C1|adjective|clear and leaving no room for doubt|We need an unequivocal answer before booking.|The captain gave an unequivocal order to abandon the sinking ship.
vacillate|C1|verb|to keep changing between opinions or choices|I tend to vacillate when both options seem equally good.|The prince continued to vacillate between the safe road and the exciting one.
veracity|C1|noun|truthfulness or accuracy|We should check the veracity of the claim before sharing it.|The detective tested the veracity of the story against the station clock.
vicarious|C1|adjective|experienced through someone else's actions rather than your own|Her travel stories gave me vicarious excitement.|The retired adventurer enjoyed a vicarious thrill while listening to the rescue story.
vindicate|C1|verb|to show that someone or their judgment was right or unfairly criticized|The final results vindicate her decision to wait.|The recovered letter would vindicate the wrongly accused messenger.
vitriolic|C1|adjective|filled with harsh and bitter criticism|The discussion turned vitriolic and stopped being productive.|The rival chef delivered a vitriolic review of the winning soup.
whimsical|C1|adjective|playfully unusual or imaginative|The garden has a whimsical collection of tiny painted doors.|A whimsical machine turned the detective's hat into a flowerpot.
zealous|C1|adjective|showing intense enthusiasm for a cause or activity|A zealous organizer can still benefit from taking a break.|The zealous apprentice polished the armor until nobody could look at it.
accountable|B2|adjective|responsible for actions and expected to explain them|Each team is accountable for its own budget.|The captain was accountable for the missing supplies.
assertive|B2|adjective|expressing your needs or opinions clearly and confidently|You can be assertive without raising your voice.|The assistant gave an assertive reply and kept the afternoon free.
coherent|B2|adjective|clear and logically connected|Your proposal needs a coherent explanation of the costs.|The witness finally gave a coherent account of the strange evening.
compelling|B2|adjective|convincing or interesting enough to hold attention|She made a compelling case for a shorter meeting.|The detective found a compelling reason to revisit the theater.
conscientious|B2|adjective|careful to do your work properly and responsibly|A conscientious colleague checks the details before sending a report.|The conscientious guard counted every guest twice.
contingency|B2|noun|a possible future event that requires preparation|We need a contingency plan in case the venue closes.|The crew prepared for every contingency except a dragon eating the map.
credible|B2|adjective|believable and worthy of trust|The explanation sounds credible but needs evidence.|The disguise was credible until the spy called the queen by the wrong name.
deliberate|B2|adjective|done intentionally rather than by accident|Leaving my phone at home was a deliberate choice.|The detective realized the misplaced photo was a deliberate clue.
discreet|B2|adjective|careful to avoid drawing attention or revealing private information|Please be discreet about the surprise party.|The spy made a discreet exit through the kitchen.
disparity|B2|noun|a significant difference or inequality|There is a disparity between the advertised price and the final bill.|The tournament revealed a disparity in the teams' experience.
empathy|B2|noun|the ability to understand another person's feelings|Listening without interrupting can show empathy.|The rival showed empathy when the exhausted hero admitted being afraid.
feasible|B2|adjective|possible and practical to carry out|Is moving the deadline still feasible?|The rescue plan became feasible when they found a second boat.
friction|B2|noun|tension or disagreement between people or groups|Unclear responsibilities create friction at work.|Sharing one tiny cabin caused friction among the adventurers.
frugal|B2|adjective|careful to avoid wasting money or resources|Being frugal helps me save for travel.|The frugal wizard repaired his old wand instead of buying a new one.
hindsight|B2|noun|understanding an event after it has happened|In hindsight, we should have booked earlier.|With hindsight, inviting both rival pirates to dinner was a mistake.
impartial|B2|adjective|fair and not favoring one side|We need an impartial person to judge the entries.|The referee tried to remain impartial even when her brother played.
incentive|B2|noun|something that encourages a person to act|A shorter commute is an incentive to accept the job.|The promise of fresh cake gave the crew an incentive to hurry.
inclusive|B2|adjective|welcoming people with different backgrounds or needs|The club aims to create an inclusive environment.|The inclusive tournament allowed beginners to compete alongside experts.
inevitable|B2|adjective|certain to happen and impossible to avoid|Some delays are inevitable during a major renovation.|A confrontation seemed inevitable after the villain stole the crown.
intuition|B2|noun|a feeling of knowing something without conscious reasoning|My intuition told me to check the address again.|The detective followed her intuition and opened the forgotten drawer.
meticulous|B2|adjective|extremely careful and attentive to detail|His meticulous notes made the handover easy.|The thief's meticulous plan failed because of one noisy shoe.
nuance|B2|noun|a small but meaningful difference in meaning or expression|A short text can miss the nuance of a conversation.|The actor changed one gesture to add nuance to the apology.
objective|B2|adjective|based on facts rather than personal feelings|We need an objective comparison of the options.|The judge struggled to stay objective when tasting her favorite dessert.
plausible|B2|adjective|seeming reasonable or likely to be true|That is a plausible explanation for the delay.|The suspect invented a plausible excuse for carrying three umbrellas.
pragmatic|B2|adjective|focused on practical results rather than abstract ideals|We took a pragmatic approach and repaired what we already had.|The pragmatic captain traded the treasure map for a working compass.
proactive|B2|adjective|taking action before a problem develops|A proactive update can prevent confusion.|The proactive mechanic checked the engine before the chase began.
rapport|B2|noun|a comfortable and trusting connection between people|We built rapport by discussing our shared interests.|The detective established rapport with the nervous witness over tea.
reciprocal|B2|adjective|given or done by each side toward the other|The arrangement depends on reciprocal support.|The two kingdoms signed a reciprocal agreement to protect each other's ships.
redundant|B2|adjective|unnecessary because something else already serves the purpose|That extra paragraph is redundant.|The new automatic gate made the old warning bell redundant.
resilient|B2|adjective|able to recover after difficulty or change|The team remained resilient after losing its funding.|The resilient explorer rebuilt the camp after the storm.
resourceful|B2|adjective|good at finding effective solutions with what is available|My resourceful neighbor fixed the shelf with spare parts.|The resourceful hero used a frying pan as a signal mirror.
skeptical|B2|adjective|not easily convinced and wanting evidence|I am skeptical of promises that sound too easy.|The skeptical guard asked the supposed prince to name the queen.
subtle|B2|adjective|not immediately obvious or easy to notice|There is a subtle difference between the two shades.|A subtle smile revealed that the detective already knew the answer.
sustainable|B2|adjective|able to continue without exhausting necessary resources|Working late every night is not sustainable.|The village needed a sustainable way to supply the travelers with food.
tangible|B2|adjective|real and definite enough to observe or measure|We need tangible evidence that the change is helping.|The first repaired bridge was a tangible sign of the town's recovery.
trade-off|B2|noun|a compromise in which gaining one benefit means losing another|A shorter commute can involve a trade-off in living space.|The player faced a trade-off between stronger armor and faster movement.
transparent|B2|adjective|open and easy to understand rather than hiding information|The company should be transparent about additional fees.|The mayor promised a transparent process for choosing the new bridge design.
versatile|B2|adjective|useful in many different situations or capable of many tasks|This versatile jacket works for both commuting and hiking.|The versatile actor played the detective, the chef, and the suspicious uncle.
viable|B2|adjective|capable of working successfully|We finally found a viable alternative to driving.|The team discovered a viable route through the mountains.
wary|B2|adjective|cautious because something may cause trouble|Be wary of offers that require an immediate payment.|The traveler was wary of the smiling merchant's free potion.
adapt|B1|verb|to change your approach to suit a new situation|It took a week to adapt to the new schedule.|The team had to adapt when the lights went out.
approach|B1|noun|a way of dealing with a task or problem|Let's try a different approach to planning meals.|The detective's unusual approach involved interviewing the dog walker first.
assume|B1|verb|to accept something as true without checking|Do not assume the shop is open on Sunday.|The guard made a mistake when he chose to assume everyone wore a badge.
boundary|B1|noun|a limit that marks what is acceptable or where something ends|Not answering work calls at dinner is a healthy boundary.|The hero drew a boundary around the camp and told everyone to stay inside.
clarify|B1|verb|to make a statement or situation easier to understand|Could you clarify which date you mean?|The captain used a drawing to clarify the escape plan.
commitment|B1|noun|a promise or responsibility that requires time and effort|Taking care of a pet is a long-term commitment.|The apprentice's commitment impressed even the impatient wizard.
considerate|B1|adjective|thoughtful about other people's needs and feelings|It was considerate of you to warn me about the delay.|The considerate neighbor stopped practicing drums when the baby fell asleep.
consistent|B1|adjective|acting or happening in a similar way over time|Small, consistent efforts help me build a habit.|The player's consistent training finally paid off in the tournament.
contribute|B1|verb|to give something that helps a shared effort|Everyone can contribute an idea during the meeting.|The quiet mechanic found a way to contribute to the rescue.
curious|B1|adjective|interested in finding out more|I am curious about how you chose that career.|The curious child opened the mysterious cupboard.
dependable|B1|adjective|able to be trusted to do what is needed|She is a dependable person to call in an emergency.|The dependable sidekick arrived with the spare keys.
distract|B1|verb|to take attention away from something|Background chatter can distract me while I read.|The juggler tried to distract the guard from the open gate.
efficient|B1|adjective|achieving a result with little wasted time or effort|Planning errands by location is more efficient.|The efficient assistant organized the chaotic office before lunch.
flexible|B1|adjective|willing or able to change when needed|My working hours are flexible on Fridays.|The travelers kept a flexible plan because the bridge might be closed.
genuine|B1|adjective|real or sincere rather than false or pretended|Her apology sounded genuine.|The detective found a genuine invitation among the forged documents.
grateful|B1|adjective|feeling thankful for help or kindness|I am grateful that you checked in.|The rescued sailor was grateful for a dry coat.
hesitate|B1|verb|to pause because you are unsure about acting|Do not hesitate to ask for clarification.|The hero began to hesitate when the bridge creaked.
insight|B1|noun|a useful understanding of something that was not obvious|Your feedback gave me insight into the problem.|The witness offered an insight that changed the investigation.
intention|B1|noun|what someone plans or means to do|My intention was to help, not interrupt.|The visitor's intention became clear when he pulled out the stolen map.
noticeable|B1|adjective|easy enough to see or recognize|The new curtains made a noticeable difference.|The actor's fake beard had a noticeable gap.
obstacle|B1|noun|something that makes progress difficult|The long commute is an obstacle to taking that job.|A fallen tree became the next obstacle in the race.
perspective|B1|noun|a particular way of seeing or understanding a situation|Hearing her story changed my perspective.|The villain's diary offered a different perspective on the battle.
priority|B1|noun|something treated as more important than other things|Getting enough sleep is my priority this week.|The captain made repairing the boat a priority.
reasonable|B1|adjective|fair or sensible in the circumstances|That sounds like a reasonable request.|The guard accepted a reasonable explanation for the late arrival.
reassure|B1|verb|to help someone feel less worried|A quick message can reassure your family that you arrived.|The pilot tried to reassure the nervous passenger.
relevant|B1|adjective|connected to the matter being discussed|Please attach the relevant receipts.|The detective asked whether the strange hat was relevant to the case.
resolve|B1|verb|to find a solution to a problem or disagreement|We should resolve the issue before booking tickets.|The rivals agreed to resolve their argument with a fair contest.
specific|B1|adjective|clearly identified or described rather than general|Please give me a specific example.|The wizard needed a specific key to open the tower.
thoughtful|B1|adjective|showing care for another person or careful consideration|Your thoughtful message made my day.|The sidekick brought a thoughtful gift for the homesick captain.
unexpected|B1|adjective|not anticipated or predicted|An unexpected call changed my plans.|An unexpected visitor interrupted the villain's speech.
afford|A2|verb|to have enough money or resources for something|I cannot afford a new laptop this month.|The character could afford the ticket only after selling his old bike.
avoid|A2|verb|to keep away from something or prevent it happening|I leave early to avoid heavy traffic.|The runner took a side street to avoid the crowd.
borrow|A2|verb|to take something temporarily with permission and return it|Could I borrow your umbrella until tomorrow?|The neighbor came over to borrow a ladder.
calm|A2|adjective|not upset, nervous, or excited|Her calm voice helped me think clearly.|The calm driver found a safe place to stop.
compare|A2|verb|to examine things to see how they are similar or different|Let's compare the two prices before choosing.|The friends began to compare their strange birthday gifts.
confident|A2|adjective|feeling sure about your ability or judgment|I feel confident about finding the station now.|The confident player stepped up for the final round.
convenient|A2|adjective|easy or suitable for a particular need|Is Saturday morning convenient for you?|The secret door provided a convenient way out.
decide|A2|verb|to choose after thinking about possibilities|We need to decide where to meet.|The friends could not decide who should answer the mysterious call.
deserve|A2|verb|to be worthy of something because of actions or qualities|You deserve a break after that long shift.|We deserve a proper celebration, the exhausted captain announced.
effort|A2|noun|physical or mental energy used to achieve something|Learning the route takes a little effort.|The rescue required an effort from every member of the crew.
encourage|A2|verb|to give someone support or confidence to act|I try to encourage my friend before interviews.|The coach gave a speech to encourage the nervous players.
familiar|A2|adjective|known or recognized from previous experience|That street name sounds familiar.|The detective heard a familiar voice behind the door.
generous|A2|adjective|willing to give more help or resources than expected|It was generous of you to share your lunch.|The generous shopkeeper gave the travelers extra bread.
improve|A2|verb|to make something better or become better|A short walk can improve my mood.|The band practiced every evening to improve their performance.
patient|A2|adjective|able to wait or deal with difficulty without becoming angry|Thank you for being patient while I checked.|The patient teacher explained the trick one more time.
polite|A2|adjective|showing respect and good manners|A polite reminder is usually enough.|The thief made a polite request for directions before running away.
prefer|A2|verb|to like one option more than another|I prefer walking when the weather is pleasant.|The detective said she would prefer tea to another cup of coffee.
promise|A2|noun|a statement that you will do something|I made a promise to call after the trip.|The hero kept a promise to return the borrowed horse.
remind|A2|verb|to help someone remember something|Please remind me to bring the charger.|The assistant had to remind the mayor about the speech.
reliable|A2|adjective|able to be trusted to work well or behave as expected|We need a reliable way to get to the airport.|The old but reliable van started just before the chase.
`;
const rows = source
  .trim()
  .split('\n')
  .map((line) => line.split('|'));
function buildBatch(rows: string[][]): Word[] {
  return rows.map(([word, difficulty, partOfSpeech, definition, first, second, category], i) => {
    const distractors = [rows[(i + 17) % rows.length], rows[(i + 43) % rows.length]];
    const explanation = `In this sentence, “${word}” means ${definition}.`;
    return validateWord({
      word,
      difficulty,
      partOfSpeech,
      pronunciation: '',
      usefulness: 85,
      categories: [category ?? (difficulty === 'C1' ? 'Reading' : 'Everyday'), 'Conversation'],
      register:
        difficulty === 'C1'
          ? 'Often formal or literary; choose it when its precise meaning fits.'
          : 'Standard English',
      sensitive: false,
      meanings: [{ definition, simple: definition, examples: [first, second] }],
      scenario: `Imagine this moment: ${second} The word describes the situation precisely.`,
      whenToUse: `Use “${word}” when you mean ${definition}.`,
      commonMistake: `Match the meaning to the situation: ${first} Do not choose a more elaborate word just to sound impressive.`,
      synonyms: [],
      antonyms: [],
      family: [],
      collocations: [],
      patterns: [first],
      memoryHook: `Picture this moment: ${second}`,
      exercises: [
        {
          type: 'meaning',
          prompt: `What does “${word}” mean?`,
          options: [distractors[0][3], definition, distractors[1][3]],
          answer: 1,
          explanation,
        },
        {
          type: 'context',
          prompt: first.replace(new RegExp(`\\b${word}\\b`, 'i'), '_____'),
          options: [word, distractors[0][0], distractors[1][0]],
          answer: 0,
          explanation: `${explanation} ${first}`,
        },
        {
          type: 'distinction',
          prompt: `Which interpretation best explains “${word}” here? ${second}`,
          options: [distractors[1][3], distractors[0][3], definition],
          answer: 2,
          explanation: `${explanation} The other choices describe different ideas.`,
        },
        {
          type: 'application',
          prompt: `Which situation uses “${word}” to mean ${definition}?`,
          options: [distractors[0][4], second, distractors[1][4]],
          answer: 1,
          explanation: `${second} ${explanation}`,
        },
      ],
    });
  });
}
export const expandedCatalog: Word[] = [
  ...buildBatch(rows),
  ...buildBatch(
    moreWords
      .trim()
      .split('\n')
      .map((line) => line.split('|')),
  ),
];
