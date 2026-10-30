package §as§.adamsmith.xorex
{
   import flash.display.Graphics;
   import flash.display.MovieClip;
   
   public class Enemy
   {
      
      public var lambda:Wavelength;
      
      public var clip:MovieClip;
      
      public function Enemy(param1:Wavelength = undefined)
      {
         if(Boot_e5d4ab.skip_constructor)
         {
            return;
         }
         lambda = param1;
         clip = new MovieClip();
         var _loc2_:Graphics = clip.graphics;
         var _loc3_:int = Wavelengths.toInt(lambda);
         _loc2_.lineStyle(2,_loc3_,0.125);
         _loc2_.drawCircle(0,0,26);
         _loc2_.lineStyle(1,_loc3_,0);
         _loc2_.beginFill(_loc3_,0.25);
         _loc2_.drawCircle(0,0,16);
         _loc2_.endFill();
         _loc2_.beginFill(_loc3_,1);
         _loc2_.drawCircle(0,0,10);
         _loc2_.endFill();
      }
   }
}

