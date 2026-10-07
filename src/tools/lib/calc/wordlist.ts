/*
 * Passphrase word list: common, easy-to-spell English words of 3–8 letters, lower case,
 * no proper nouns. Duplicates are removed at load; entropy is computed from the final size.
 */
const RAW = `
able about above acid acorn actor adapt adult afraid after again agent agree ahead aim air alarm album alert alien alike alive alley allow almond alone along alpha amber amount ample anchor angel angle animal ankle answer apple april apron arch arena argue arm armor army arrow art artist ash aside atlas atom attic audio aunt autumn avocado award awake axis
baby bacon badge bagel baker bakery balance ball bamboo banana band bank banner barn barrel basil basket bath beach beacon bead beam bean bear beard beast beaver bed bee beef beetle begin bell belt bench berry bike bird birth bison blade blanket blast blaze blend blink block bloom blossom blue blur board boat body boil bolt bone bonus book boot border bottle bounce bowl box brain branch brass brave bread breeze brick bride bridge brief bright brisk broom brother brown brush bubble bucket buckle budget buffalo build bulb bundle bunny burger butter button buzz
cabin cable cactus cage cake calm camel camera camp canal candle candy canoe canvas canyon cape captain car carbon card cargo carpet carrot cart castle cat catch cattle cave cedar ceiling celery cell cement center cereal chain chair chalk champ change chapel charm chart chase cheek cheese chef cherry chess chest chicken chief child chili chimney chin chip choice chord circle circus citrus city civic clam clap class claw clay clean clerk click cliff climb clock cloth cloud clover clown club coach coal coast coat cobalt cocoa coconut code coffee coin cold collar colony color comb comet comic cook cookie copper coral cord corn corner cotton couch count county cousin cover cow coyote crab craft crane crater crayon cream creek crew cricket crisp crop cross crow crowd crown crumb crust crystal cube cup curly curtain curve cushion cycle
daily dairy daisy dance danger dart dash data dawn deal debate decade deck deer degree delta denim desert design desk detail diary diesel dinner dish diver doctor dog dollar dolphin dome donkey door dot double dough dove dozen draft dragon drama drawer dream dress drift drill drink drum duck dune dust
eagle early earth easel east easy echo edge eight elbow elder elephant elk elm ember empty end energy engine enjoy entry equal erase errand escape essay event exact exit expert extra
fabric face fact fair fairy falcon fame family fan fancy farm fast feast feather fence fern ferry fiber field fig film final finch finger fire firm fish five flag flame flash flat flavor fleet flight float flock flood floor flour flower fluid flute focus fog foil folder folk food foot forest fork fort fossil fox frame fresh friend frog frost fruit fudge fuel funny fur future
gadget galaxy game garage garden garlic gate gauge gear gecko gem giant gift ginger giraffe glad glass globe glove glow glue goal goat gold golf good goose gorilla gospel grain grape graph grass gravel gravy great green grid grill grin grocery ground group grove guard guess guest guide guitar gulf gum
habit hair hall hammer hand happy harbor hat hawk hazel head health heart heat hedge heel helmet help herb hero heron hill hint hippo hobby hockey holiday honey hood hook hope horn horse host hotel hour house hug human humor hunt hurry
ice icon idea igloo image inch index ink inner input insect invite iron island item ivory ivy
jacket jaguar jam jar jazz jeans jelly jewel job jockey join joke journal joy judge juice jump jungle junior jury
kangaroo kayak keen kettle key kick kid kidney king kiosk kite kitten kiwi knee knife knot koala
label lace ladder lady lake lamb lamp land lane laptop large laser later laugh lava lawn layer leaf lean learn leather lemon lens leopard letter level lever library light lily lime limit linen lion lip liquid list little lizard llama loaf lobby lobster local lock locket log logic long loop lotus loud lounge lucky lumber lunar lunch lung
machine magic magnet maid mail major mango manor maple marble march market mask match meadow meal medal melody melon member memory menu mercy merry mesh metal meter middle mild milk mill mint minute mirror mist mitten mixer model modern moment monkey month moon moose morning mosaic moss motor mountain mouse mouth movie muffin mule museum music mustard myth
nail name napkin narrow nation native nature navy near neat neck needle nest net never new news nickel night nine noble noise noodle normal north nose note novel number nurse nut nutmeg
oak oasis oat object ocean octopus offer office olive omega onion open opera orange orbit orchard order organ otter outer oval oven owl owner oxygen oyster
paddle page paint pair palace palm panda panel paper parade parcel park parrot party pasta paste patch path patio pause peach peak peanut pear pebble pecan pedal pencil penguin people pepper piano pickle picnic piece pig pigeon pillow pilot pine pink pipe pirate pizza place plain planet plant plate plaza plenty plum pocket poem poet polar pond pony pool poppy porch port potato pottery pouch powder praise prism prize proud prune puddle pulse pump pumpkin punch puppy purple puzzle
quail quart queen quest quick quiet quilt quiz quote
rabbit raccoon radar radio radish raft rail rain rainbow raisin rally ramp ranch range rapid raven razor ready recipe record red reef relax relay remote rhythm ribbon rice rich riddle ride ridge ring ripple river road robin robot rocket rodeo roof room rooster root rope rose round route royal rubber ruby rug ruler rumor runner rural rust
saddle safe saga sail salad salmon salt sample sand sandal satin sauce saucer scale scarf scene school science scoop scout screen script sea seal season seat second seed shadow shape shark sheep shelf shell shield shine ship shirt shoe shore short shovel shower shrimp sign silent silk silver simple siren sister six sketch ski skill skirt sky sled sleep slice slide slope smile smoke snack snail snake snow soap soccer sock sofa soft solar soup south space spark sparrow spice spider spike spinach spirit sponge spoon sport spot spring sprout square squash squid stable stage stairs stamp star station steam steel stem step stereo stick stone stool storm story stove straw stream street stripe studio sugar suit summer summit sun sunny sunset supper surf swamp swan sweater sweet swift swing symbol syrup
table tablet taco tail tale talent tango tank tape target taxi tea teacher team teapot temple tennis tent thank theory thread throne thumb thunder ticket tide tiger tile timber time tiny toast today toe token tomato tomorrow tone tongue tool tooth topic torch tower town toy track tractor trade trail train travel tray treaty tree trend tribe trick trophy truck trumpet trunk tulip tuna tunnel turkey turtle tuxedo twelve twig twin type
umbrella uncle under unicorn union unit upper urban useful usual
vacuum valley value van vapor vase vault velvet vendor venue verse vessel vest video view village vine violet violin visit visor vital vivid voice volcano vote voyage
wafer wagon waist walk wall walnut walrus wander warm wave wax weather web wedge week weekend well west whale wheat wheel whisper whistle white wide width willow wind window winter wire wisdom wish wizard wolf wonder wood wool word work world worm wrist writer
yacht yard year yellow yogurt young yummy
zebra zero zigzag zinc zipper zone zoo
alarm bridge cabin daring eager fabled gentle humble jolly kindly lively mellow nimble orbit placid quaint rustic sturdy tender upbeat valiant witty zesty
absent acre adore agile almost amaze annual apex arcade ardent ascend atrium avenue
banjo baron basin batch beagle beret birch blimp bluff bobcat bonnet boulder bramble breadth brine broth buggy bushel
cadet canopy carton cashew cavern chalet chapter cinder clever cobble comfort compass condor cosmic cottage crimson cuckoo cupid curio
dapper decoy dimple ditto doodle drizzle dynamo
eclipse elegant elixir emblem enamel engrave epic estate evening exhibit
fable falafel fiddle flannel flicker flurry foliage forage frolic funnel
galley gallop garnet gentle geyser gizmo glacier glider goblet gondola gopher granite griddle grotto gusto
hamlet harvest hatch hearth helium hermit hiccup hollow homage honest horizon hummus husky
iceberg impact indigo inlet insight island jasmine jigsaw jovial juggle jumbo
kernel kindle kitchen knack lagoon lantern lattice legend lilac linger locust lofty lullaby lyric
magpie mammoth mantle marina marsh meteor midday mimic minnow mobile mocha molten monarch morsel muslin
nectar nimbus noodle nugget oatmeal obelisk opal origami outpost
pajamas palette parsley pastel pebbly pelican pepper petal pewter pinball plume polka poncho porter potion prairie pretzel puffin
quarry quiver radiant ragtime rattle relic remedy rhubarb ripple rivet rocky rosebud rotary
saffron salsa sapling satchel sequin sherbet shimmer silo skillet slalom snorkel sonnet spindle splash sprocket stencil sundial swivel
tadpole tamarind tandem tapestry teardrop terrace thimble thistle timid toucan tundra turbine tweed
upland utmost velour verdant vinegar vista waffle walkway warble wigwam wildcat winsome wombat yonder zenith
`;

export const WORDS: readonly string[] = Array.from(new Set(RAW.split(/\s+/).filter((w) => /^[a-z]{3,9}$/.test(w))));
