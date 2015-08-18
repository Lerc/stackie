# stackie
A little stack machine for making textures

This is what happens when you read about a 13k JavaScript competition right before bed

At 4am I was lying in bed awake because my brain was designing a tiny texture generator

Today, I coded it.

As it stands, the minified javascript is 1652 bytes and it can generate ImageData textures from short strings. Chrome seems to be a bit slower than FireFox at running the code.  That FireFox runs it so well is a credit to their optimisers.

The design is sligtly similar to Ibniz except not focusing on live animation


instructions
###
     x : push x (x is in range 0...1)
     y : push y (y is in range 0...1)
     0...9 : push constant 0...9
     P : push PI
     d : duplicate top item on the stack 
     s : sin 
     c : cos 
     q : sqrt 
     p : perlin noise (using top two stack values) 
     a : atan2 
     + : add 
     - : subtract 
     * : multiply 
     / : divide 
     ~ : abs 
     ^ : pow 
     ! : push(1-pop()) 


 `Stackie.program(code)` takes a string and returns a function(x,y) that returns a Number;

 `Stackie.makeField(w,h)` takes a witdh and height and returns a Field object 

 The Field object has methods
 ```
    getValue(x,y);
    setValue(x,y,value);
    getImageData(mappingFunction(fieldValue)->ARGB_UInt32);
    generate(function(x,y)->fieldValue)
```
so to generate a puff of smoke and a grey flame 

```javascript
  var f=Stackie.makeField(256,256);
  f.generate(Stackie.program("x8*y8*p1+2/x2*y2*p+x28**y28**p4/+112/x-d*-112/y-d*-*d*d*d*d**"));
  var smoke = f.getImageData();
  f.generate(Stackie.program("x1x-*5*dx4**y3*p+y!-"));
  var flame = f.getImageData();

``` 

