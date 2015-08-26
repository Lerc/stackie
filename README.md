# stackie
A little stack machine for making textures

This is what happens when you read about a 13k JavaScript competition right before bed

At 4am I was lying in bed awake because my brain was designing a tiny texture generator

Today, I coded it.

As it stands, the minified javascript is 2334 bytes and it can generate ImageData textures from short strings. Chrome seems to be a bit slower than FireFox at running the code.  That FireFox runs it so well is a credit to their optimisers.

The design is sligtly similar to Ibniz except not focusing on live animation


Instructions
###


     x : push x (x is in range 0...1)
     y : push y (y is in range 0...1)
     0...9 : push constant 0...9
     P : push PI

     d : duplicate top item on the stack 
     : : swap top two items on the stack
     ; : swap top and third items on the stack

     s : sin 
     c : cos 
     q : sqrt 
     ~ : abs 
     ! : flip        1-a                  implemented as  push(1-pop()) 

     p : perlin noise (using top two stack values) 
     a : atan2 
     + : add 
     - : subtract 
     * : multiply 
     / : divide 
     ^ : pow         
     > : max         
     < : min         



`Stackie.program(code)` takes a string and returns a function(x,y) that returns a Number;

`Stackie.makeField(w,h)` takes a width and height and returns a Field object 

`Stackie.setSeed(seed)` initializes the stackie program random number seed.

`Stackie.makeRandom(seed)`  returns a random number generation function using the passed seed.

`Stackie.makePaletteMapper(code)` generates a palette mapper function from a stackie code string.  The red, green, blue values are sampled from the 0, 0.5 and 1.0 image y-positions respectively.

`Stackie.generate(imageCode,paletteCode,[size=256])` The just-do-it function.  You put in a string for the image, a string for the palette and it returns an ImageData that can be rendered onto a canvas context with putImageData()


Images are created as fields of Float32 values.

 Fields have a few methods
 ```
    get(x,y);   
    set(x,y,value);
    getImageData(mappingFunction(fieldValue)->ARGB_UInt32);
    generate(function(x,y)->fieldValue)    
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




