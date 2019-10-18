-- Window Tiling

local hyper = {"cmd", "alt", "ctrl", "shift"}

hs.hotkey.bind(hyper, "w", function()
  local win = hs.window.focusedWindow()
  win:moveToUnit({x=0, y=0, w=0.5, h=0.5})
end)

hs.hotkey.bind(hyper, "e", function()
  local win = hs.window.focusedWindow()
  win:moveToUnit({x=0, y=0, w=1, h=0.5})
end)

hs.hotkey.bind(hyper, "r", function()
  local win = hs.window.focusedWindow()
  win:moveToUnit({x=0.5, y=0, w=0.5, h=0.5})
end)

hs.hotkey.bind(hyper, "s", function()
  local win = hs.window.focusedWindow()
  win:moveToUnit({x=0, y=0, w=0.5, h=1})
end)

hs.hotkey.bind(hyper, "x", function()
  local win = hs.window.focusedWindow()
  win:moveToUnit({x=0, y=0.5, w=0.5, h=0.5})
end)

hs.hotkey.bind(hyper, "c", function()
  local win = hs.window.focusedWindow()
  win:moveToUnit({x=0, y=0.5, w=1, h=0.5})
end)

hs.hotkey.bind(hyper, "v", function()
  local win = hs.window.focusedWindow()
  win:moveToUnit({x=0.5, y=0.5, w=0.5, h=0.5})
end)

hs.hotkey.bind(hyper, "f", function()
  local win = hs.window.focusedWindow()
  win:moveToUnit({x=0.5, y=0, w=0.5, h=1})
end)

hs.hotkey.bind(hyper, "d", function()
  local win = hs.window.focusedWindow()
  win:moveToUnit({x=0, y=0, w=1, h=1})
end)

-- Dynamic Tiling

hs.hotkey.bind(hyper, "g", function()
  local sim = hs.application.find("com.apple.iphonesimulator")
  if sim == nil then return end

  local ide = hs.application.find("com.apple.dt.Xcode")
  if ide == nil then return end

  local simWin = sim:mainWindow()
  if simWin == nil then return end

  local ideWin = ide:mainWindow()
  if ideWin == nil then return end

  local screen = ideWin:screen()
  local screenFrame = screen:frame()
  local simFrame = simWin:frame()
  local ideFrame = ideWin:frame()

  if simFrame.w > simFrame.h then
    -- Rotate?
    return
  end

  if simWin:screen() ~= screen then
    simWin:moveToScreen(screen, true)
  end

  local simWidth = screenFrame.h * simFrame.w / simFrame.h

  if ideFrame == screenFrame then
    ideWin:raise()
    simWin:focus()
    simWin:setFrame({x=screenFrame.w - simWidth, y=screenFrame.y, w=simWidth, h=screenFrame.h})
    ideWin:setFrame({x=screenFrame.x, y=screenFrame.y, w=screenFrame.w - simWidth, h=screenFrame.h})
  else
    ideWin:focus()
    ideWin:setFrame(screenFrame)
  end
end)

-- Window Hints

hs.hotkey.bind(hyper, "j",hs.hints.windowHints)

-- Application Shortcuts

--hs.hotkey.bind(hyper, "t", function()
--  hs.urlevent.openURL("https://www.dict.cc/?s=")
--end)
