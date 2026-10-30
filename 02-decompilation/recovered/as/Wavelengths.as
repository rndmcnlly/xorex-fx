package §as§.adamsmith.xorex
{
   public class Wavelengths
   {
      
      public static var options:Array;
      
      public function Wavelengths()
      {
         if(Boot_e5d4ab.skip_constructor)
         {
            return;
         }
      }
      
      public static function toInt(param1:Wavelength) : int
      {
         switch(param1.index)
         {
            case 0:
               return 16711680;
            case 1:
               return 65280;
            case 2:
               return 255;
            case 3:
               return 16776960;
            case 4:
               return 16711935;
            case 5:
               return 16777215;
            case 6:
               return 0;
            default:
               return int(null);
         }
      }
      
      public static function choose() : Wavelength
      {
         var _loc6_:* = null as Array;
         var _loc1_:int = int(Lambda.fold(Lambda.map(Wavelengths.options,function(param1:Object):int
         {
            return int(param1[1]);
         }),function(param1:int, param2:int):int
         {
            return param1 + param2;
         },0));
         var _loc2_:Number = Math.random() * _loc1_;
         var _loc3_:int = 0;
         var _loc4_:int = 0;
         var _loc5_:Array = Wavelengths.options;
         while(_loc4_ < int(_loc5_.length))
         {
            _loc6_ = _loc5_[_loc4_];
            _loc4_++;
            _loc3_ += int(_loc6_[1]);
            if(_loc3_ > _loc2_)
            {
               return _loc6_[0];
            }
         }
         return Wavelength.Black;
      }
   }
}

