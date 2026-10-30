package §as§.adamsmith.xorex
{
   import flash.display.DisplayObject;
   import flash.display.MovieClip;
   import haxe.Timer;
   
   public class CombatModel extends MovieClip
   {
      
      public var contents:Array;
      
      public function CombatModel()
      {
         if(Boot_e5d4ab.skip_constructor)
         {
            return;
         }
         super();
         contents = [];
         clear();
      }
      
      public function synthesize(param1:int, param2:Energy) : void
      {
         var _loc4_:int = 0;
         var _loc5_:int = 0;
         var _loc6_:int = 0;
         var _loc3_:List = contents[param1];
         if(param2.lambda != null)
         {
            _loc4_ = 0;
            _loc5_ = param2.n;
            while(_loc4_ < _loc5_)
            {
               _loc6_ = _loc4_++;
               _loc3_.add(new Enemy(param2.lambda));
            }
         }
         redraw();
      }
      
      public function sprinkleOne() : void
      {
         contents[Main.chooseOne()].push(new Enemy(Wavelengths.choose()));
         redraw();
      }
      
      public function shouldTerminate() : Boolean
      {
         var _loc3_:* = null as List;
         var _loc1_:int = 0;
         var _loc2_:Array = contents;
         while(_loc1_ < int(_loc2_.length))
         {
            _loc3_ = _loc2_[_loc1_];
            _loc1_++;
            if(_loc3_.length > 14)
            {
               return true;
            }
         }
         return false;
      }
      
      public function redraw() : void
      {
         var _loc4_:int = 0;
         var _loc5_:int = 0;
         var _loc6_:* = null;
         var _loc7_:* = null as Enemy;
         var _loc8_:* = null as MovieClip;
         var _loc1_:Number = Timer.stamp();
         var _loc2_:int = 0;
         var _loc3_:int = numChildren;
         while(_loc2_ < _loc3_)
         {
            _loc4_ = _loc2_++;
            removeChild(getChildAt(0));
         }
         _loc2_ = 0;
         _loc3_ = Main.n;
         while(_loc2_ < _loc3_)
         {
            _loc4_ = _loc2_++;
            _loc5_ = 0;
            _loc6_ = contents[_loc4_].iterator();
            while(_loc6_.hasNext())
            {
               _loc7_ = _loc6_.next();
               _loc8_ = _loc7_.clip;
               _loc7_.clip.x = 40 * _loc4_ + 20 + 0;
               _loc7_.clip.y = _loc5_ + 0;
               _loc5_ += 40;
               addChild(_loc7_.clip);
            }
         }
      }
      
      public function gather(param1:int) : Energy
      {
         var _loc2_:List = contents[param1];
         var _loc3_:Energy = new Energy();
         while(_loc2_.length > 0)
         {
            if(_loc2_.last().lambda == Wavelength.Black)
            {
               break;
            }
            if(_loc3_.lambda == null)
            {
               _loc3_.lambda = _loc2_.last().lambda;
            }
            if(_loc3_.lambda != _loc2_.last().lambda)
            {
               break;
            }
            _loc2_.remove(_loc2_.last());
            ++_loc3_.n;
         }
         redraw();
         return _loc3_;
      }
      
      public function fire(param1:int, param2:Energy) : void
      {
         var _loc5_:int = 0;
         var _loc3_:int = 0;
         var _loc4_:int = param2.n;
         while(_loc3_ < _loc4_)
         {
            _loc5_ = _loc3_++;
            if(contents[param1].length > 0)
            {
               contents[param1].remove(contents[param1].last());
               break;
            }
         }
         redraw();
      }
      
      public function clear() : void
      {
         var _loc3_:int = 0;
         var _loc1_:int = 0;
         var _loc2_:int = Main.n;
         while(_loc1_ < _loc2_)
         {
            _loc3_ = _loc1_++;
            contents[_loc3_] = new List();
         }
         redraw();
      }
   }
}

