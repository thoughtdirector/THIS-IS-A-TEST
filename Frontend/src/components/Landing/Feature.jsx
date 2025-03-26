import { Badge } from "@/components/ui/badge";
import Logo from "/assets/images/logo.png";
import {

    Image,

  } from "@chakra-ui/react"
const Feature = () => (
  <div className="w-full py-3 lg:py-6">
    <div className="container mx-auto">
      <div className="flex flex-col-reverse lg:flex-row gap-10 lg:items-center">
        <div className="bg-muted rounded-md w-full aspect-video h-full flex-1"><Image src={Logo} alt="logo" p={6} /></div>
        <div className="flex gap-4 pl-0 lg:pl-20 flex-col  flex-1">
          <div>
            <Badge>Platform</Badge>
          </div>
          <div className="flex gap-2 flex-col">
            <h2 className="text-xl md:text-5xl tracking-tighter lg:max-w-xl font-regular text-left text-main-white">
              Not Just Experts, The Best Tools Too
            </h2>
            <p className="text-lg max-w-xl lg:max-w-sm leading-relaxed tracking-tight text-muted-foreground text-main-white text-left">
              Danta reduces costs through AI agents that handle specific tasks. Use the latest AI tools to complete your projects

            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Feature