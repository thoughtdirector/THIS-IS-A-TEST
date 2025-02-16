import { Box, Container, Text } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"

import useAuth from "../hooks/useAuth"
import Landing from "../components/Landing/Landing"



function Index() {
  const { user: currentUser } = useAuth()

  return (
    <>
      
     <Landing />
      
    </>
  )
}

export default Index