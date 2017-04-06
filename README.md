# stackie
A little stack machine for making textures

This is what happens when you read about a 13k JavaScript competition right before bed

At 4am I was lying in bed awake because my brain was designing a tiny texture generator

Today, I coded it.

As it stands, the minified javascript is 2531 bytes and it can generate ImageData textures from short strings. Chrome seems to be a bit slower than FireFox at running the code.  That FireFox runs it so well is a credit to their optimisers.

Here it is in action http://fingswotidun.com/stackie/?code=x1x-*5*dx4**y3*p%2By!-&palette=xy!1%2B*&seed=877588

Or if you prefer something nice and abstract
http://fingswotidun.com/stackie/?code=yx%2F1%3Cx!-~&palette=xy4*p1%2B2%2Fx*qq&seed=351589

There is a doubly minified version that constructs itself by string substitution and eval-ing the result.  This doesn't gain you much if you are going by gzipped size but worth it if you are code golfing by file size.  It was constructed partly by hand so there is no guarantee that stackie-minmin.js will be up to date. 

The design is sligtly similar to Ibniz except not focusing on live animation


At its heart Stackie generates Fields, effectively greyscale images.   A simple palette mapping function to generate colour images is provided. More complex colour images will can be built with composing methods not (yet) provided. For now you will have to make your own compositors.  

Instructions
###

pushes
     x : push x (x is in range 0...1)
     y : push y (y is in range 0...1)
     0...9 : push constant 0...9
     r : push a random number
     P : push PI

stack manipulation
     d : duplicate top item on the stack 
     : : swap top two items on the stack
     ; : swap top and third items on the stack

Using 1 stack value
     s : sin 
     c : cos 
     q : sqrt 
     l : log
     ~ : abs 
     ! : flip        1-a                  implemented as  push(1-pop()) 
     # : round to nearest integer
     $ : floor to integer
     
     e : smootherstep easing function    implemented as push(smootherStep(pop));

     ? : threshold  ( value<=0 becomes 0, value>0 becomes 1 );  

using 2 stack values
     p : perlin noise (using top two stack values) 

     a : atan2 
     + : add 
     - : subtract 
     * : multiply 
     / : divide 
     ^ : pow         
     > : max         
     < : min         

Using 3 stack values
     E : smootherstep interpolation,  uses three stack values A B V.  Interpolates between A and B by V
     w : wraparound perlin noise using three stack values x,y,size  (x and y are multiplied by size)

Using 4 stack values
     W : wraparound perlin noise using 4 stack values x,y,x_size, y_size (x is multiplied by x_size t is multiplied by y_size)


`Stackie.program(code)` takes a string and returns a function(x,y) that returns a Number;

`Stackie.makeField(w=256,h=w)` takes a width and height and returns a Field object 

`Stackie.setSeed(seed)` initializes the stackie program random number seed. 

`Stackie.makeRandom(seed)`  returns a simple random number generation function using the passed seed.

`Stackie.makePaletteMapper(code)` generates a palette mapper function from a stackie code string.  The red, green, blue values are sampled from the 0, 0.5 and 1.0 image y-positions respectively.  

So
 color[0].r is generated from codeFunction(0.0,0.0)
 color[0].g is generated from codeFunction(0.0,0.5)
 color[0].b is generated from codeFunction(0.0,1.0)
 color[255].r is generated from codeFunction(1.0,0.0)
 color[255].g is generated from codeFunction(1.0,0.5)
 color[255].b is generated from codeFunction(1.0,1.0)

`Stackie.generate(imageCode,paletteCode,[size=256])` The just-do-it function.  You put in a string for the image, a string for the palette and it returns an ImageData that can be rendered onto a canvas context with putImageData()


To produce an image you start with a Field.  Fields are 2D arrays of Float32  
 Fields have a few methods
 ```
    get(x,y);   
    set(x,y,value);
    getImageData(mappingFunction(fieldValue)=>ARGB_UInt32);
    generate( (x,y)=>fieldValue )    
```
To turn a field into ImageData the getImageData method will geneate a ImageData object by running each pixel through a mapper function.   If no mapper function is provided a default
mapper will be used which will map the values 0...1 to a  rgba greyscale.


To use stackie you can either make a field object and use the methods of the object
to  generate and extract the image.  This lets you reuse the same allocated field for multiple
images.   A simpler approach is to just use Stacky.generate() which you can pass image code and palette code and a ImageData object is returned ready for use by putImageData.

```javascript
	//make a field and fill it
	var f=Stackie.makeField(256,256);
	f.generate(Stackie.program("x8*y8*p1+2/x2*y2*p+x28**y28**p4/+112/x-d*-112/y-d*-*d*d*d*d**"));
	var smoke = f.getImageData();

	//shorthand approach.  Just give me the ImageData. 
	var flame=Stackie.generate("x1x-*5*dx4**y3*p+y!-","xy!1+*");
	canvas_ctx.putImageData(image,0,0); 
``` 

Of course you can also use the field and stack program parts seperately. 

For instance if you want to have a randomly generated island in a game you could use 

```javascript
var islandGenerator= Stackie.program("x12/-d*y12/-d*+!8^xy2w1+xy8w2/+xy4w2/+*19/-0>");
// islandGenerate now contains a function that will calculate the altitude of an island at x,y;  
``` 

similarly you can use the Field object without the stack machine.

```javascript
	//make a field and fill it
	var f=Stackie.makeField(256,256);
	f.generate( (x,y)=>Math.abs(x-0.5)*y);
``` 

###

useful snippits
```        
    ;:             move the top of the stack two places down
    
    :;             move the item two places down to the top of the stack

    ;:;            turn ABXY into AXBY

    :d;:d;          turn AB into ABAB
    x12/-y12/-     field of -0.5 to 0.5 istead of 0.0 to 1.0
    aP/1+2/        anticlockwise radial gradient around 0,0

    d*:d*+q        turn AB into the result the length of the vectorAB

    x12/-y12/-aP/1+2/  an anticlockwise radial gradient around the center.

    x88**sy29**c+2/24^^~0>x?!+  This makes a good contour line palette
```    