

nano ~/.config/pipewire/pipewire.conf.d/combined-sink.conf


-=-=-=-==-=-=-=

context.modules = [
  {
    name = libpipewire-module-combine-stream
    args = {
      combine.mode = sink
      node.name = "combined_sink"
      node.description = "Schiit + Matisse Combined"
      combine.props = {
        audio.position = [ FL FR ]
      }
      stream.props = {
        audio.position = [ FL FR ]
      }
      stream.rules = [
        {
          matches = [ { node.name = "alsa_output.usb-Schiit_Audio_Schiit_Modi_3E-00.analog-stereo" } ]
          actions = { create-stream = { } }
        }
        {
          matches = [ { node.name = "alsa_output.pci-0000_0b_00.4.analog-stereo" } ]
          actions = { create-stream = { } }
        }
      ]
    }
  }
]
