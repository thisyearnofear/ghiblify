"use client";

import {
  Container,
  Heading,
  Text,
  Input,
  Button,
  Stack,
  Image,
  Link,
  SkeletonCircle,
  SkeletonText,
  Box,
  FormControl,
  Center,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Wrap,
  WrapItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [selectedImageURL, setSelectedImageURL] = useState("");
  const [generatedImageURL, setGeneratedImageURL] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Example images
  const exampleImages = {
    grow: "/examples/grow.png",
    grow2: "/examples/grow2.png",
    bridge: "/examples/bridge.png",
    bridge0: "/examples/0bridge.png",
  };

  // Determine API URL based on environment
  const API_URL =
    process.env.NODE_ENV === "development"
      ? "http://localhost:8000"
      : "https://ghiblify.onrender.com";

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      setSelectedImageURL(reader.result);
      setUploadedFileName(file.name);
      setSelectedFile(file);
      setGeneratedImageURL(""); // Clear previous result
      setError(""); // Clear previous errors
    };

    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const handleGhiblify = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch(`${API_URL}/upload_photo`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.result) {
        setGeneratedImageURL(data.result);
      } else {
        throw new Error(data.message || "Error processing image");
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (image) => {
    setModalImage(image);
    onOpen();
  };

  return (
    <Container>
      <Box borderWidth="0px" mx="0px" my="10px">
        <Text
          color="#4682A9"
          mt="50px"
          fontSize="7xl"
          fontFamily="Arial"
          fontWeight="bold"
          textAlign="center"
        >
          ghiblify &#128444;
        </Text>
      </Box>
      <Box borderWidth="0px" mx="0px" mt="15px" ml="5px">
        <Text textAlign="center">your world Studio Ghibli style</Text>
      </Box>

      <Tabs isFitted variant="enclosed" mt={8}>
        <TabList mb="1em">
          <Tab></Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Flex direction="column" align="center" gap={4}>
              <FormControl>
                <Input
                  type="file"
                  id="fileInput"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
                <Button
                  mx="5px"
                  my="20px"
                  as="label"
                  htmlFor="fileInput"
                  color="#4682A9"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  width="100%"
                >
                  upload photo
                </Button>
              </FormControl>
              {selectedImageURL && (
                <Button
                  onClick={handleGhiblify}
                  color="#4682A9"
                  isDisabled={loading}
                >
                  {loading ? "Ghiblifying..." : "Ghiblify!"}
                </Button>
              )}
            </Flex>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
        gap={4}
        mb={8}
      >
        {loading ? (
          <Stack>
            <Flex justifyContent="center" alignItems="center">
              <SkeletonCircle />
            </Flex>
            <Text fontSize="xs">
              Transforming your image into Ghibli style...
            </Text>
          </Stack>
        ) : (
          <>
            {selectedImageURL && (
              <Box>
                <Text textAlign="center" mb={2}>
                  Original Image
                </Text>
                <Image src={selectedImageURL} boxShadow="lg" maxH="400px" />
              </Box>
            )}
            {generatedImageURL && (
              <Box>
                <Text textAlign="center" mb={2}>
                  Ghibli Style
                </Text>
                <Image src={generatedImageURL} boxShadow="lg" maxH="400px" />
              </Box>
            )}
            {error && (
              <Text color="red.500" mt={4}>
                {error}
              </Text>
            )}
          </>
        )}
      </Box>

      <Text fontSize="xs" fontFamily="Arial" textAlign="center" my="30px">
        built by{" "}
        <Link href="https://vishalshenoy.com/" isExternal>
          vishal
        </Link>{" "}
        &{" "}
        <Link href="https://warpcast.com/papa" isExternal>
          papa
        </Link>
      </Text>

      <Box mt={8} mb={12}>
        <Text textAlign="center" fontSize="md" mb={6} color="gray.600">
          Examples
        </Text>
        <Flex justify="center" gap={4} flexWrap="nowrap">
          <Image
            src={exampleImages.grow}
            alt="Original peaceful scene"
            height="120px"
            width="120px"
            objectFit="cover"
            borderRadius="md"
            cursor="pointer"
            onClick={() => handleImageClick(exampleImages.grow)}
            _hover={{ transform: "scale(1.05)", transition: "0.2s" }}
          />
          <Image
            src={exampleImages.grow2}
            alt="Ghibli style peaceful scene"
            height="120px"
            width="120px"
            objectFit="cover"
            borderRadius="md"
            cursor="pointer"
            onClick={() => handleImageClick(exampleImages.grow2)}
            _hover={{ transform: "scale(1.05)", transition: "0.2s" }}
          />
          <Image
            src={exampleImages.bridge0}
            alt="Original Golden Gate Bridge"
            height="120px"
            width="120px"
            objectFit="cover"
            borderRadius="md"
            cursor="pointer"
            onClick={() => handleImageClick(exampleImages.bridge0)}
            _hover={{ transform: "scale(1.05)", transition: "0.2s" }}
          />
          <Image
            src={exampleImages.bridge}
            alt="Ghibli style Golden Gate Bridge"
            height="120px"
            width="120px"
            objectFit="cover"
            borderRadius="md"
            cursor="pointer"
            onClick={() => handleImageClick(exampleImages.bridge)}
            _hover={{ transform: "scale(1.05)", transition: "0.2s" }}
          />
        </Flex>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody p={4}>
            <Image
              src={modalImage}
              alt="Enlarged view"
              width="100%"
              objectFit="contain"
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
}
