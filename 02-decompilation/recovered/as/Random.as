package §as§.adamsmith.xorex
{
   public class Random
   {
      
      public function Random()
      {
         if(Boot_e5d4ab.skip_constructor)
         {
            return;
         }
      }
      
      public static function randInt(param1:int, param2:int) : int
      {
         return param1 + int(Math.floor(Math.random() * (param2 - param1)));
      }
      
      public static function choose(param1:Object) : Object
      {
         var _loc2_:Array = Lambda.array(param1);
         return _loc2_[Random.randInt(0,int(_loc2_.length))];
      }
   }
}

