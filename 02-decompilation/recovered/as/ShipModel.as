package §as§.adamsmith.xorex
{
   import flash.display.Graphics;
   import flash.display.MovieClip;
   import flash.filters.GlowFilter;
   
   public class ShipModel extends MovieClip
   {
      
      public var pos:int;
      
      public var inventory:Energy;
      
      public var glyph:MovieClip;
      
      public var combat:CombatModel;
      
      public var capacitor:Energy;
      
      public function ShipModel(param1:CombatModel = undefined)
      {
         if(Boot_e5d4ab.skip_constructor)
         {
            return;
         }
         super();
         combat = param1;
         pos = Main.chooseOne();
         inventory = new Energy();
         capacitor = new Energy();
         glyph = new MovieClip();
         y = 540;
         addChild(glyph);
         var _loc2_:GlowFilter = new GlowFilter();
         _loc2_.color = 16777215;
         _loc2_.alpha = 0.25;
         _loc2_.blurX = 25;
         _loc2_.blurY = 5;
         var _loc3_:GlowFilter = new GlowFilter();
         _loc3_.color = 16777215;
         _loc3_.alpha = 0.25;
         _loc3_.blurX = 5;
         _loc3_.blurY = 50;
         filters = [_loc2_,_loc3_];
         redraw();
      }
      
      public function right() : void
      {
         if(pos < Main.n - 1)
         {
            pos += 1;
            redraw();
         }
         else
         {
            Main.triggerEvent("fizzle");
         }
      }
      
      public function redraw() : void
      {
         var _loc4_:int = 0;
         var _loc5_:int = 0;
         var _loc6_:int = 0;
         glyph.x = pos * 40 + 20;
         var _loc1_:Graphics = glyph.graphics;
         _loc1_.clear();
         _loc1_.lineStyle(30,16777215,0.05);
         _loc1_.moveTo(0,0);
         _loc1_.lineTo(0,-1500);
         _loc1_.lineStyle(8,16777215);
         _loc1_.moveTo(0,0);
         _loc1_.lineTo(-20,20);
         _loc1_.moveTo(0,0);
         _loc1_.lineTo(20,20);
         var _loc2_:int = 0;
         var _loc3_:int = inventory.n;
         while(_loc2_ < _loc3_)
         {
            _loc4_ = _loc2_++;
            _loc5_ = (_loc4_ + 2) * 6;
            _loc6_ = Wavelengths.toInt(inventory.lambda);
            _loc1_.lineStyle(2,_loc6_);
            _loc1_.drawCircle(0,-40,_loc5_);
         }
         _loc2_ = 0;
         _loc3_ = capacitor.n;
         while(_loc2_ < _loc3_)
         {
            _loc4_ = _loc2_++;
            _loc5_ = (_loc4_ + 2) * 6;
            _loc6_ = Wavelengths.toInt(capacitor.lambda);
            _loc1_.lineStyle(2,_loc6_);
            _loc1_.moveTo(0,0 + _loc5_);
            _loc1_.lineTo(-20,20 + _loc5_);
            _loc1_.moveTo(0,0 + _loc5_);
            _loc1_.lineTo(20,20 + _loc5_);
         }
      }
      
      public function left() : void
      {
         if(pos > 0)
         {
            pos -= 1;
            redraw();
         }
         else
         {
            Main.triggerEvent("fizzle");
         }
      }
      
      public function gather() : void
      {
         var _loc1_:* = null as Energy;
         if(inventory.lambda == null)
         {
            _loc1_ = combat.gather(pos);
            if(_loc1_.lambda != null)
            {
               inventory = _loc1_;
               redraw();
               Main.triggerEvent("gather");
            }
         }
         else if(capacitor.lambda == null || capacitor.lambda == inventory.lambda)
         {
            capacitor.lambda = inventory.lambda;
            _temp_1.n += inventory.n;
            inventory.reset();
            redraw();
            Main.triggerEvent("compact");
         }
         else if(inventory.lambda == Wavelength.White)
         {
            if(Main.kongregateApi)
            {
               Main.kongregate.stats.submit("WhiteOrbsChained",inventory.n);
            }
            _temp_2.n += 5 * (inventory.n * inventory.n);
            inventory.reset();
            redraw();
         }
         else
         {
            inventory.reset();
            capacitor.reset();
            redraw();
            Main.triggerEvent("fizzle");
         }
      }
      
      public function fire() : void
      {
         if(inventory.lambda == null)
         {
            if(capacitor.lambda != null)
            {
               combat.fire(pos,capacitor);
               capacitor.decrement();
               redraw();
               Main.triggerEvent("fire");
            }
         }
         else
         {
            combat.synthesize(pos,inventory);
            inventory.reset();
            redraw();
            Main.triggerEvent("synth");
         }
      }
   }
}

