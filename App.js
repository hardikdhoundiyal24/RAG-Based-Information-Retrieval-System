// src/App.js

import React, { useState } from 'react';
import {
  ChakraProvider,
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Input,
  Button,
  Spinner,
  Alert,
  Container,
  FormControl,
  FormLabel,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { FaFileUpload, FaPaperPlane, FaFilePdf } from 'react-icons/fa';

function App() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [askLoading, setAskLoading] = useState(false);
  const [fileStatus, setFileStatus] = useState('');
  const toast = useToast();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileStatus(`Selected file: ${selectedFile.name}`);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file first.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://127.0.0.1:5000/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setFileStatus(`File uploaded and RAG pipeline is ready!`);
        toast({
          title: 'Upload successful',
          description: 'Your document has been processed.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'File upload failed');
      }
    } catch (err) {
      console.error(err);
      toast({
        title: 'Upload failed',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) {
      toast({
        title: 'No question entered',
        description: 'Please enter a question to get an answer.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!fileStatus.includes('ready')) {
      toast({
        title: 'Document not ready',
        description: 'Please upload and process a file first.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setAskLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setAnswer(data.answer || 'No answer found.');
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error getting answer',
        description: 'Could not connect to the backend or an error occurred.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setAskLoading(false);
    }
  };

  return (
    <ChakraProvider>
      <Box p={8} bg="gray.100" minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Container maxW="container.lg">
          <VStack spacing={8} align="stretch" p={10} bg="white" boxShadow="xl" borderRadius="lg">
            <Heading as="h1" size="2xl" textAlign="center" color="teal.500">
              <HStack justifyContent="center">
                <FaFilePdf />
                <Text>RAG Pipeline Q&A</Text>
              </HStack>
            </Heading>

            {/* File Upload Section */}
            <Box p={6} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="gray.50">
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel fontWeight="bold">Upload your PDF document</FormLabel>
                  <HStack spacing={4}>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      p={1}
                      border="1px solid"
                      borderColor="gray.200"
                    />
                    <Button
                      leftIcon={<FaFileUpload />}
                      colorScheme="blue"
                      onClick={handleUpload}
                      isLoading={uploadLoading}
                      isDisabled={!file}
                    >
                      Upload Document
                    </Button>
                  </HStack>
                </FormControl>
                {fileStatus && (
                  <Alert status={fileStatus.includes('ready') ? 'success' : 'info'} borderRadius="md">
                    {fileStatus}
                  </Alert>
                )}
              </VStack>
            </Box>

            {/* Question & Answer Section */}
            <Box p={6} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="gray.50">
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel fontWeight="bold">Ask a question</FormLabel>
                  <Textarea
                    placeholder="Enter your question here..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                </FormControl>
                <Button
                  rightIcon={<FaPaperPlane />}
                  colorScheme="green"
                  onClick={handleAsk}
                  isLoading={askLoading}
                  isDisabled={!fileStatus.includes('ready')}
                >
                  Ask Question
                </Button>
                
                {answer && (
                  <Box p={4} bg="green.50" borderRadius="md" w="full">
                    <Text fontWeight="bold" color="green.700">Answer:</Text>
                    <Text mt={2}>{answer}</Text>
                  </Box>
                )}
              </VStack>
            </Box>
          </VStack>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App;